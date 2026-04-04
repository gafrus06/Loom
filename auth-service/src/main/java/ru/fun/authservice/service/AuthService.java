package ru.fun.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ru.fun.authservice.dto.UserRegisteredEvent;
import ru.fun.authservice.dto.UserRoleChangedEvent;
import ru.fun.authservice.entity.AppRole;
import ru.fun.authservice.entity.RefreshToken;
import ru.fun.authservice.entity.User;
import ru.fun.authservice.entity.UserRole;
import ru.fun.authservice.repository.RefreshTokenRepository;
import ru.fun.authservice.repository.UserRepository;
import ru.fun.authservice.repository.UserRoleRepository;
import ru.fun.authservice.utils.JwtUtil;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final OutboxService outboxService;

    @Value("${jwt.access-token-validity-minutes}")
    private int accessTokenMinutes;

    @Value("${jwt.refresh-token-validity-minutes}")
    private int refreshTokenMinutes;

    public record LoginResult(String accessToken, String refreshToken) {}

    @Transactional
    public void register(String email, String password) {
        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .build();
        userRepository.save(user);

        UserRole baseRole = UserRole.builder()
                .user(user)
                .role(AppRole.ROLE_USER.value())
                .assignedByUserId(null)
                .build();
        userRoleRepository.save(baseRole);

        outboxService.enqueue(
                OutboxPublisher.USER_REGISTERED,
                user.getId(),
                new UserRegisteredEvent(user.getId().toString(), user.getEmail(), AppRole.ROLE_USER.value())
        );

        log.info("Registered: email={} userId={}", email, user.getId());
    }

    public LoginResult login(String email, String password) {
        User user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid credentials or account disabled"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        log.info("Login: userId={} roles={}", user.getId(), user.getActiveRoleNames());
        return buildLoginResult(user);
    }

    @Transactional
    public LoginResult refresh(String token) {
        RefreshToken rt = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (rt.isRevoked()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token revoked");
        }
        if (rt.getExpiryDate().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expired");
        }

        User user = rt.getUser();
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account disabled");
        }

        return buildLoginResult(user, rt);
    }

    @Transactional
    public void logout(String token) {
        refreshTokenRepository.findByToken(token).ifPresent(rt -> {
            rt.setRevoked(true);
            refreshTokenRepository.save(rt);
            log.info("Logout: token revoked for userId={}", rt.getUser().getId());
        });
    }

    @Transactional
    public void logoutAll(UUID userId) {
        int count = refreshTokenRepository.revokeAllByUserId(userId);
        log.info("LogoutAll: revoked {} tokens for userId={}", count, userId);
    }

    @Transactional
    public LoginResult forceRefresh(UUID userId) {
        User user = getUserById(userId);
        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account disabled");
        }
        return buildLoginResult(user);
    }

    @Transactional
    public void assignRole(UUID targetUserId, String roleName, UUID actorUserId) {
        User actor = getUserById(actorUserId);
        User target = getUserById(targetUserId);
        validateCanAssign(actor, roleName);
        assignRoleRecord(target, targetUserId, roleName, actorUserId);
    }

    @Transactional
    public void assignRoleInternal(UUID targetUserId, String roleName) {
        User target = getUserById(targetUserId);
        assignRoleRecord(target, targetUserId, roleName, null);
    }

    @Transactional
    public void removeRole(UUID targetUserId, String roleName, UUID actorUserId) {
        User actor = getUserById(actorUserId);
        User target = getUserById(targetUserId);

        if (AppRole.ROLE_USER.value().equals(roleName)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Cannot remove base role ROLE_USER");
        }

        UserRole userRole = userRoleRepository
                .findByUserIdAndRoleAndActiveTrue(targetUserId, roleName)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User " + targetUserId + " does not have active role " + roleName));

        boolean isSuperAdmin = actor.hasRole(AppRole.ROLE_SUPER_ADMIN.value());
        boolean isAssigner = actorUserId.equals(userRole.getAssignedByUserId());

        if (!isSuperAdmin && !isAssigner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only the assigner or SUPER_ADMIN can remove this role");
        }

        userRoleRepository.findByUserIdAndRoleAndActiveFalse(targetUserId, roleName)
                .ifPresent(userRoleRepository::delete);
        userRole.setActive(false);
        userRole.setRevokedAt(Instant.now());
        userRole.setRevokedByUserId(actorUserId);
        userRoleRepository.save(userRole);

        outboxService.enqueue(
                OutboxPublisher.USER_ROLE_CHANGED,
                targetUserId,
                new UserRoleChangedEvent(targetUserId.toString(), roleName, "REMOVED")
        );
        bumpTokenVersion(target);

        log.info("removeRole: role={} removed from userId={} by actorId={}", roleName, targetUserId, actorUserId);
    }

    @Transactional
    public void deactivateUser(UUID targetUserId, UUID actorUserId) {
        User target = getUserById(targetUserId);

        if (target.isSuperAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot deactivate SUPER_ADMIN");
        }

        target.setActive(false);
        bumpTokenVersion(target);
        refreshTokenRepository.revokeAllByUserId(targetUserId);

        log.info("deactivateUser: userId={} deactivated by actorId={}", targetUserId, actorUserId);
    }

    @Transactional
    public void activateUser(UUID targetUserId, UUID actorUserId) {
        User target = getUserById(targetUserId);
        target.setActive(true);
        bumpTokenVersion(target);
        log.info("activateUser: userId={} activated by actorId={}", targetUserId, actorUserId);
    }

    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found: " + id));
    }

    public User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found: " + email));
    }

    @Transactional(readOnly = true)
    public List<UserRole> getActiveRoles(UUID userId) {
        getUserById(userId);
        return userRoleRepository.findByUserIdAndActiveTrue(userId);
    }

    public LoginResult generateTokens(User user) {
        return buildLoginResult(user);
    }

    @Transactional
    public long getCurrentTokenVersion(UUID userId) {
        return getUserById(userId).getTokenVersion();
    }

    private void assignRoleRecord(User target, UUID targetUserId, String roleName, UUID actorUserId) {
        try {
            if (userRoleRepository.existsByUserIdAndRoleAndActiveTrue(targetUserId, roleName)) {
                log.info("assignRole: userId={} already has active role={}, skipping", targetUserId, roleName);
                return;
            }

            UserRole userRole = userRoleRepository
                    .findByUserIdAndRoleAndActiveFalse(targetUserId, roleName)
                    .map(existingRole -> reactivateRole(existingRole, actorUserId))
                    .orElseGet(() -> UserRole.builder()
                            .user(target)
                            .role(roleName)
                            .assignedByUserId(actorUserId)
                            .build());
            userRoleRepository.save(userRole);
        } catch (DataIntegrityViolationException ex) {
            log.info("assignRole race resolved by unique constraint for userId={} role={}", targetUserId, roleName);
            return;
        }

        outboxService.enqueue(
                OutboxPublisher.USER_ROLE_CHANGED,
                targetUserId,
                new UserRoleChangedEvent(targetUserId.toString(), roleName, "ASSIGNED")
        );
        bumpTokenVersion(target);

        log.info("assignRole: role={} assigned to userId={} by actorId={}", roleName, targetUserId, actorUserId);
    }

    private void validateCanAssign(User actor, String roleName) {
        AppRole target = AppRole.fromString(roleName);
        if (target == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role: " + roleName);
        }

        if (actor.hasRole(AppRole.ROLE_SUPER_ADMIN.value())) return;

        if (actor.hasRole(AppRole.ROLE_ADMIN.value())) {
            if (target == AppRole.ROLE_COUNSELOR || target == AppRole.ROLE_PARENT) return;
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "ADMIN can only assign ROLE_COUNSELOR or ROLE_PARENT");
        }

        if (actor.hasRole(AppRole.ROLE_COUNSELOR.value())) {
            if (target == AppRole.ROLE_PARENT) return;
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "COUNSELOR can only assign ROLE_PARENT");
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "You do not have permission to assign roles");
    }

    private LoginResult buildLoginResult(User user) {
        String accessToken = jwtUtil.generateAccessToken(
                user.getId(), user.getEmail(), user.getActiveRoleNames(), user.getTokenVersion(), accessTokenMinutes);
        String refreshToken = jwtUtil.generateRefreshToken(
                user.getId(), user.getTokenVersion(), refreshTokenMinutes);

        saveOrUpdateRefreshToken(user, refreshToken);
        return new LoginResult(accessToken, refreshToken);
    }

    private LoginResult buildLoginResult(User user, RefreshToken existingRt) {
        String accessToken = jwtUtil.generateAccessToken(
                user.getId(), user.getEmail(), user.getActiveRoleNames(), user.getTokenVersion(), accessTokenMinutes);
        String newRefresh = jwtUtil.generateRefreshToken(
                user.getId(), user.getTokenVersion(), refreshTokenMinutes);

        existingRt.setToken(newRefresh);
        existingRt.setExpiryDate(Instant.now().plus(refreshTokenMinutes, ChronoUnit.MINUTES));
        existingRt.setRevoked(false);
        refreshTokenRepository.save(existingRt);

        return new LoginResult(accessToken, newRefresh);
    }

    private void saveOrUpdateRefreshToken(User user, String refreshToken) {
        RefreshToken rt = refreshTokenRepository.findByUser(user)
                .orElse(RefreshToken.builder().user(user).build());

        rt.setToken(refreshToken);
        rt.setExpiryDate(Instant.now().plus(refreshTokenMinutes, ChronoUnit.MINUTES));
        rt.setRevoked(false);
        refreshTokenRepository.save(rt);
    }

    private UserRole reactivateRole(UserRole userRole, UUID assignedByUserId) {
        userRole.setActive(true);
        userRole.setAssignedByUserId(assignedByUserId);
        userRole.setAssignedAt(Instant.now());
        userRole.setRevokedAt(null);
        userRole.setRevokedByUserId(null);
        return userRole;
    }

    private void bumpTokenVersion(User user) {
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
    }
}
