package ru.fun.apigateway;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import ru.fun.apigateway.client.AuthInternalClient;
import ru.fun.apigateway.config.AppGatewayProperties;
import ru.fun.apigateway.config.RateLimitProperties;
import ru.fun.apigateway.filter.JwtGatewayFilter;
import ru.fun.apigateway.utils.JwtUtil;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtGatewayFilterTokenVersionTest {

    private static final String JWT_SECRET = "c2VjcmV0Y2hhbmdlLW1lLXNlY3JldC1mb3ItdGVzdHMtMDEyMzQ1Njc4OTA=";

    private final JwtUtil jwtUtil = new JwtUtil(JWT_SECRET);
    private final AuthInternalClient authInternalClient = mock(AuthInternalClient.class);
    private JwtGatewayFilter filter;

    @BeforeEach
    void setUp() {
        AppGatewayProperties gatewayProperties = new AppGatewayProperties();
        gatewayProperties.setPublicPaths(List.of("/api/auth/login"));
        RateLimitProperties rateLimitProperties = new RateLimitProperties();
        rateLimitProperties.setReplenishRate(100);
        rateLimitProperties.setBurstCapacity(100);

        filter = new JwtGatewayFilter(jwtUtil, authInternalClient, gatewayProperties, rateLimitProperties);
        ReflectionTestUtils.setField(filter, "internalAuthSecret", "internal-proof-test-secret");
    }

    @Test
    void acceptsFreshAccessToken() {
        UUID userId = UUID.randomUUID();
        String token = createToken(userId, 2L);
        when(authInternalClient.fetchTokenVersion(userId)).thenReturn(2L);
        AtomicReference<ServerWebExchange> forwardedExchange = new AtomicReference<>();

        MockServerHttpRequest request = MockServerHttpRequest.get("/api/users/profile")
                .header("Authorization", "Bearer " + token)
                .build();
        ServerWebExchange exchange = MockServerWebExchange.from(request);

        filter.filter(exchange, mutatedExchange -> {
            forwardedExchange.set(mutatedExchange);
            return Mono.empty();
        }).block();

        assertThat(exchange.getResponse().getStatusCode()).isNull();
        assertThat(forwardedExchange.get()).isNotNull();
        assertThat(forwardedExchange.get().getRequest().getHeaders().getFirst("X-User-Id")).isEqualTo(userId.toString());
    }

    @Test
    void rejectsAccessTokenWithStaleTokenVersion() {
        UUID userId = UUID.randomUUID();
        String token = createToken(userId, 1L);
        when(authInternalClient.fetchTokenVersion(userId)).thenReturn(2L);

        MockServerHttpRequest request = MockServerHttpRequest.get("/api/users/profile")
                .header("Authorization", "Bearer " + token)
                .build();
        ServerWebExchange exchange = MockServerWebExchange.from(request);

        filter.filter(exchange, ignored -> Mono.empty()).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    private String createToken(UUID userId, long tokenVersion) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setSubject("user@example.com")
                .claim("id", userId.toString())
                .claim("roles", Set.of("ROLE_USER"))
                .claim("tv", tokenVersion)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plus(10, ChronoUnit.MINUTES)))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(JWT_SECRET)), SignatureAlgorithm.HS256)
                .compact();
    }
}
