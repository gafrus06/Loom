package ru.fun.authservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import ru.fun.authservice.entity.RefreshToken;
import ru.fun.authservice.entity.User;
import ru.fun.authservice.repository.RefreshTokenRepository;
import ru.fun.authservice.repository.UserRepository;
import ru.fun.authservice.repository.UserRoleRepository;
import ru.fun.authservice.service.AuthService;
import ru.fun.authservice.service.OutboxService;
import ru.fun.authservice.utils.JwtUtil;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTokenVersionTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final UserRoleRepository userRoleRepository = mock(UserRoleRepository.class);
    private final RefreshTokenRepository refreshTokenRepository = mock(RefreshTokenRepository.class);
    private final OutboxService outboxService = mock(OutboxService.class);
    private final JwtUtil jwtUtil = new JwtUtil();

    private AuthService authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(jwtUtil, "secret", "c2VjcmV0Y2hhbmdlLW1lLXNlY3JldC1mb3ItdGVzdHMtMDEyMzQ1Njc4OTA=");
        authService = new AuthService(
                userRepository,
                userRoleRepository,
                refreshTokenRepository,
                mock(org.springframework.security.crypto.password.PasswordEncoder.class),
                jwtUtil,
                outboxService
        );
        ReflectionTestUtils.setField(authService, "accessTokenMinutes", 5);
        ReflectionTestUtils.setField(authService, "refreshTokenMinutes", 60);
    }

    @Test
    void refreshRotatesToCurrentTokenVersionEvenWhenPreviousAccessIsStale() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .password("pw")
                .tokenVersion(2L)
                .active(true)
                .build();
        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), 1L, 60);
        RefreshToken storedToken = RefreshToken.builder()
                .user(user)
                .token(refreshToken)
                .expiryDate(Instant.now().plusSeconds(600))
                .revoked(false)
                .build();

        when(refreshTokenRepository.findByToken(refreshToken)).thenReturn(Optional.of(storedToken));

        AuthService.LoginResult refreshed = authService.refresh(refreshToken);

        assertThat(jwtUtil.extractTokenVersion(refreshed.accessToken())).isEqualTo(2L);
        assertThat(jwtUtil.extractTokenVersion(refreshed.refreshToken())).isEqualTo(2L);
    }

    @Test
    void generatedAccessTokenContainsCurrentTokenVersion() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .password("pw")
                .tokenVersion(7L)
                .active(true)
                .build();
        user.setUserRoles(Set.of());
        when(refreshTokenRepository.findByUser(user)).thenReturn(Optional.empty());

        AuthService.LoginResult result = authService.generateTokens(user);

        assertThat(jwtUtil.extractTokenVersion(result.accessToken())).isEqualTo(7L);
        assertThat(jwtUtil.extractTokenVersion(result.refreshToken())).isEqualTo(7L);
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }
}
