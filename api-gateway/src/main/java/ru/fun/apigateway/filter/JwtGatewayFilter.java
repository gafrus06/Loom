package ru.fun.apigateway.filter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import ru.fun.apigateway.config.AppGatewayProperties;
import ru.fun.apigateway.config.RateLimitProperties;
import ru.fun.apigateway.utils.JwtUtil;

import java.time.Duration;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Главный глобальный фильтр Gateway. Порядок работы для каждого запроса:
 *  1. Rate Limiting   — ограничение запросов по IP (Bucket4j, in-memory)
 *  2. Public path     — публичные пути пропускаются без JWT (список в application.yml)
 *  3. JWT validation  — проверка подписи и срока действия токена
 *  4. Header inject   — добавление X-User-Id, X-User-Name, X-User-Roles в downstream-запрос
 *     (микросервисы читают эти заголовки и не парсят JWT сами)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtGatewayFilter implements GlobalFilter, Ordered {

    private final JwtUtil jwtUtil;
    private final AppGatewayProperties gatewayProperties;
    private final RateLimitProperties rateLimitProperties;

    // IP → Bucket (ведро токенов для каждого клиента)
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        log.info("JwtGatewayFilter initialized. Public paths: {}", gatewayProperties.getPublicPaths());
        log.info("Rate limit: {}/s, burst: {}", rateLimitProperties.getReplenishRate(), rateLimitProperties.getBurstCapacity());
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().toString();
        String clientIp = resolveClientIp(exchange);

        // ─── 1. RATE LIMITING ────────────────────────────────────────────────
        Bucket bucket = buckets.computeIfAbsent(clientIp, this::createBucket);
        if (!bucket.tryConsume(1)) {
            log.warn("Rate limit exceeded for IP={} path={}", clientIp, path);
            exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            exchange.getResponse().getHeaders().add("X-Rate-Limit-Retry-After-Seconds", "1");
            return exchange.getResponse().setComplete();
        }

        // ─── 2. ПУБЛИЧНЫЕ ПУТИ ───────────────────────────────────────────────
        if (gatewayProperties.isPublic(path)) {
            log.debug("Public path, skipping JWT check: {}", path);
            return chain.filter(exchange);
        }

        // ─── 3. JWT VALIDATION ───────────────────────────────────────────────
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

        // ─── 4. INJECT USER HEADERS ──────────────────────────────────────────
        // Микросервисы читают X-User-* и не парсят JWT — gateway уже всё проверил
        try {
            String userId   = jwtUtil.extractId(jwtToken);
            String username = jwtUtil.extractUsername(jwtToken);
            Set<String> roles = jwtUtil.extractRoles(jwtToken);

            log.info("Authenticated userId={} username={} path={}", userId, username, path);

            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .header("Authorization",  authHeader)
                    .header("X-User-Id",      userId   != null ? userId   : "")
                    .header("X-User-Name",    username != null ? username : "")
                    .header("X-User-Roles",   String.join(",", roles))
                    .build();

            return chain.filter(exchange.mutate().request(mutatedRequest).build());

        } catch (Exception e) {
            log.error("Failed to extract claims from JWT for path={}", path, e);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }
    }

    @Override
    public int getOrder() {
        return -1; // выполняется раньше всех остальных фильтров
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    /**
     * Создаёт новое ведро токенов для IP.
     * Bucket4j использует алгоритм Token Bucket:
     *   - каждую секунду добавляется replenishRate токенов
     *   - максимум в ведре — burstCapacity
     */
    private Bucket createBucket(String ip) {
        Refill refill = Refill.intervally(
                rateLimitProperties.getReplenishRate(),
                Duration.ofSeconds(1)
        );
        Bandwidth limit = Bandwidth.classic(rateLimitProperties.getBurstCapacity(), refill);
        return Bucket.builder().addLimit(limit).build();
    }

    /**
     * Берёт реальный IP клиента, учитывая прокси (X-Forwarded-For).
     */
    private String resolveClientIp(ServerWebExchange exchange) {
        String forwarded = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // X-Forwarded-For может содержать цепочку: "client, proxy1, proxy2"
            return forwarded.split(",")[0].trim();
        }
        var remoteAddress = exchange.getRequest().getRemoteAddress();
        return remoteAddress != null ? remoteAddress.getAddress().getHostAddress() : "unknown";
    }
}