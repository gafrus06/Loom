package ru.fun.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ru.fun.authservice.dto.UserRegisteredEvent;
import ru.fun.authservice.dto.UserRoleChangedEvent;
import ru.fun.authservice.entity.RefreshToken;
import ru.fun.authservice.entity.Role;
import ru.fun.authservice.entity.User;
import ru.fun.authservice.exception.InsufficientPermissionsException;
import ru.fun.authservice.kafka.UserEventProducer;
import ru.fun.authservice.repository.RefreshTokenRepository;
import ru.fun.authservice.repository.RoleRepository;
import ru.fun.authservice.repository.UserRepository;
import ru.fun.authservice.utils.JwtUtil;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final UserEventProducer userEventProducer;

    @Value("${jwt.access-token-validity-minutes}")
    private int accessTokenMinutes;

    @Value("${jwt.refresh-token-validity-minutes}")
    private int refreshTokenMinutes;

    public record LoginResult(String accessToken, String refreshToken) {}

    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    @Transactional
    public void register(String email, String password) {
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists");
        }

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("ROLE_USER not found"));

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .roles(new HashSet<>(Set.of(userRole)))
                .build();

        userRepository.save(user);

        userEventProducer.publishUserRegistered(
                new UserRegisteredEvent(
                        user.getId().toString(),
                        user.getEmail(),
                        userRole.getName()
                )
        );

        log.info("User {} registered successfully", user.getEmail());
    }

    public LoginResult login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        return buildLoginResult(user);
    }

    public LoginResult refresh(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (refreshToken.isRevoked() || refreshToken.getExpiryDate().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expired or revoked");
        }

        return buildLoginResult(refreshToken.getUser(), refreshToken);
    }

    @Transactional
    public void logout(String token) {
        refreshTokenRepository.findByToken(token).ifPresent(rt -> {
            rt.setRevoked(true);
            refreshTokenRepository.save(rt);
            log.info("Refresh token revoked for user {}", rt.getUser().getId());
        });
    }

    @Transactional
    public void removeRoleById(UUID userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found: " + userId
                ));

        if ("ROLE_USER".equals(roleName)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot remove base role ROLE_USER"
            );
        }

        boolean removed = user.getRoles().removeIf(role -> role.getName().equals(roleName));

        if (!removed) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "User does not have role: " + roleName
            );
        }

        userRepository.save(user);

        userEventProducer.publishUserRoleChanged(
                new UserRoleChangedEvent(
                        user.getId().toString(),
                        roleName,
                        "REMOVED"
                )
        );

        log.info("Removed role {} from user {} and published REMOVED event", roleName, userId);
    }

    @Transactional
    public void assignRoleById(UUID userId, String roleName) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found: " + userId
                ));

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Role not found: " + roleName
                ));

        boolean alreadyHas = user.getRoles().stream()
                .anyMatch(r -> r.getName().equals(roleName));

        if (alreadyHas) {
            log.info("User {} already has role {}", userId, roleName);
            return;
        }

        user.getRoles().add(role);
        userRepository.save(user);

        userEventProducer.publishUserRoleChanged(
                new UserRoleChangedEvent(
                        user.getId().toString(),
                        role.getName(),
                        "ASSIGNED"
                )
        );

        log.info("Assigned role {} to user {} and published ASSIGNED event", roleName, userId);
    }

    @Transactional
    public void assignRole(String email, String roleName, User currentUser) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Role not found"
                ));

        boolean isAdmin = currentUser.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ROLE_ADMIN"));

        if (!isAdmin && ("ROLE_ADMIN".equals(roleName) || "ROLE_COUNSELOR".equals(roleName))) {
            throw new InsufficientPermissionsException(
                    "Insufficient permissions to assign role: " + roleName
            );
        }

        boolean alreadyHas = user.getRoles().stream()
                .anyMatch(r -> r.getName().equals(roleName));

        if (alreadyHas) {
            log.info("User {} already has role {}", user.getId(), roleName);
            return;
        }

        user.getRoles().add(role);
        userRepository.save(user);

        userEventProducer.publishUserRoleChanged(
                new UserRoleChangedEvent(
                        user.getId().toString(),
                        role.getName(),
                        "ASSIGNED"
                )
        );

        log.info("Assigned role {} to user {} and published ASSIGNED event", roleName, user.getId());
    }

    public LoginResult generateTokens(User user) {
        return buildLoginResult(user);
    }

    private LoginResult buildLoginResult(User user) {
        String accessToken = jwtUtil.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRoles(),
                accessTokenMinutes
        );

        String refreshToken = jwtUtil.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRoles(),
                refreshTokenMinutes
        );

        saveOrUpdateRefreshToken(user, refreshToken);

        return new LoginResult(accessToken, refreshToken);
    }

    private LoginResult buildLoginResult(User user, RefreshToken refreshTokenEntity) {
        String accessToken = jwtUtil.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRoles(),
                accessTokenMinutes
        );

        String newRefresh = jwtUtil.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRoles(),
                refreshTokenMinutes
        );

        refreshTokenEntity.setToken(newRefresh);
        refreshTokenEntity.setExpiryDate(Instant.now().plus(refreshTokenMinutes, ChronoUnit.MINUTES));
        refreshTokenEntity.setRevoked(false);
        refreshTokenRepository.save(refreshTokenEntity);

        return new LoginResult(accessToken, newRefresh);
    }

    private void saveOrUpdateRefreshToken(User user, String refreshToken) {
        RefreshToken token = refreshTokenRepository.findByUser(user)
                .orElse(RefreshToken.builder().user(user).build());

        token.setToken(refreshToken);
        token.setExpiryDate(Instant.now().plus(refreshTokenMinutes, ChronoUnit.MINUTES));
        token.setRevoked(false);

        refreshTokenRepository.save(token);
    }
}