package ru.fun.apigateway.filter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import ru.fun.apigateway.client.AuthInternalClient;
import ru.fun.apigateway.config.AppGatewayProperties;
import ru.fun.apigateway.config.RateLimitProperties;
import ru.fun.apigateway.utils.JwtUtil;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtGatewayFilter implements GlobalFilter, Ordered {

    private static final String HEADER_USER_ID = "X-User-Id";
    private static final String HEADER_USER_NAME = "X-User-Name";
    private static final String HEADER_USER_ROLES = "X-User-Roles";
    private static final String HEADER_CALLER_SERVICE = "X-Caller-Service";
    private static final String HEADER_INTERNAL_TIMESTAMP = "X-Internal-Timestamp";
    private static final String HEADER_INTERNAL_SIGNATURE = "X-Internal-Signature";
    private static final String CALLER_SERVICE = "api-gateway";

    private final JwtUtil jwtUtil;
    private final AuthInternalClient authInternalClient;
    private final AppGatewayProperties gatewayProperties;
    private final RateLimitProperties rateLimitProperties;

    @Value("${internal-auth.secret:${INTERNAL_AUTH_SECRET:}}")
    private String internalAuthSecret;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        if (internalAuthSecret == null || internalAuthSecret.isBlank()) {
            throw new IllegalStateException("internal-auth.secret must be configured");
        }
        log.info("JwtGatewayFilter initialized. Public paths: {}", gatewayProperties.getPublicPaths());
        log.info("Rate limit: {}/s, burst: {}", rateLimitProperties.getReplenishRate(), rateLimitProperties.getBurstCapacity());
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().toString();
        String clientIp = resolveClientIp(exchange);

        Bucket bucket = buckets.computeIfAbsent(clientIp, this::createBucket);
        if (!bucket.tryConsume(1)) {
            log.warn("Rate limit exceeded for IP={} path={}", clientIp, path);
            exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            exchange.getResponse().getHeaders().add("X-Rate-Limit-Retry-After-Seconds", "1");
            return exchange.getResponse().setComplete();
        }

        if (gatewayProperties.isPublic(path)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Missing Authorization header ip={} path={}", clientIp, path);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        String jwtToken = authHeader.substring(7);
        if (!jwtUtil.validateToken(jwtToken)) {
            log.warn("Invalid JWT token ip={} path={}", clientIp, path);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        try {
            String userId = jwtUtil.extractId(jwtToken);
            String username = jwtUtil.extractUsername(jwtToken);
            Set<String> roles = jwtUtil.extractRoles(jwtToken);
            long tokenVersion = jwtUtil.extractTokenVersion(jwtToken);
            String rolesRaw = String.join(",", roles);

            return authInternalClient.fetchTokenVersion(java.util.UUID.fromString(userId))
                    .flatMap(currentTokenVersion -> {
                        if (tokenVersion != currentTokenVersion) {
                            log.warn("Stale JWT token for userId={} path={}", userId, path);
                            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                            return exchange.getResponse().setComplete();
                        }

                        String timestamp = String.valueOf(Instant.now().getEpochSecond());
                        String signature = sign(exchange.getRequest().getMethod().name(), path, "user", timestamp, userId, username, rolesRaw);

                        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                                .header("Authorization", authHeader)
                                .header(HEADER_USER_ID, safe(userId))
                                .header(HEADER_USER_NAME, safe(username))
                                .header(HEADER_USER_ROLES, safe(rolesRaw))
                                .header(HEADER_CALLER_SERVICE, CALLER_SERVICE)
                                .header(HEADER_INTERNAL_TIMESTAMP, timestamp)
                                .header(HEADER_INTERNAL_SIGNATURE, signature)
                                .build();

                        return chain.filter(exchange.mutate().request(mutatedRequest).build());
                    })
                    .onErrorResume(e -> {
                        log.error("Failed to resolve current token version for userId={} path={}", userId, path, e);
                        exchange.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
                        return exchange.getResponse().setComplete();
                    });
        } catch (Exception e) {
            log.error("Failed to extract claims from JWT for path={}", path, e);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }

    @Override
    public int getOrder() {
        return -1;
    }

    private Bucket createBucket(String ip) {
        Refill refill = Refill.intervally(
                rateLimitProperties.getReplenishRate(),
                Duration.ofSeconds(1)
        );
        Bandwidth limit = Bandwidth.classic(rateLimitProperties.getBurstCapacity(), refill);
        return Bucket.builder().addLimit(limit).build();
    }

    private String resolveClientIp(ServerWebExchange exchange) {
        var remoteAddress = exchange.getRequest().getRemoteAddress();
        return remoteAddress != null ? remoteAddress.getAddress().getHostAddress() : "unknown";
    }

    private String sign(String method,
                        String path,
                        String subjectType,
                        String timestamp,
                        String userId,
                        String userName,
                        String rolesRaw) {
        try {
            String payload = CALLER_SERVICE + "\n"
                    + subjectType + "\n"
                    + timestamp + "\n"
                    + method + "\n"
                    + path + "\n"
                    + safe(userId) + "\n"
                    + safe(userName) + "\n"
                    + safe(rolesRaw);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(internalAuthSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign internal auth headers", e);
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
