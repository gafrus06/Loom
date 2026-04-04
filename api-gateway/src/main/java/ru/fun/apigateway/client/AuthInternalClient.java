package ru.fun.apigateway.client;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Ticker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

@Component
public class AuthInternalClient {

    private final WebClient.Builder webClientBuilder;
    private final String internalAuthSecret;
    private final Cache<UUID, Long> tokenVersionCache;

    @Autowired
    public AuthInternalClient(WebClient.Builder webClientBuilder,
                              @Value("${internal-auth.secret:${INTERNAL_AUTH_SECRET:}}") String internalAuthSecret,
                              ru.fun.apigateway.config.TokenVersionCacheProperties cacheProperties) {
        this(webClientBuilder, requireInternalSecret(internalAuthSecret), cacheProperties.getTtlSeconds(), cacheProperties.getMaxSize(), Ticker.systemTicker());
    }

    AuthInternalClient(WebClient.Builder webClientBuilder,
                       String internalAuthSecret,
                       long ttlSeconds,
                       long maxSize,
                       Ticker ticker) {
        this.webClientBuilder = webClientBuilder;
        this.internalAuthSecret = internalAuthSecret;
        this.tokenVersionCache = Caffeine.newBuilder()
                // Short-lived cache cuts auth-service fan-out but still bounds stale privilege window.
                .expireAfterWrite(Duration.ofSeconds(Math.max(1, ttlSeconds)))
                .maximumSize(Math.max(100, maxSize))
                .ticker(ticker)
                .build();
    }

    public Mono<Long> fetchTokenVersion(UUID userId) {
        Long cached = tokenVersionCache.getIfPresent(userId);
        if (cached != null) {
            return Mono.just(cached);
        }
        return fetchTokenVersionLive(userId)
                .doOnNext(tokenVersion -> tokenVersionCache.put(userId, tokenVersion));
    }

    public void invalidateTokenVersion(UUID userId) {
        tokenVersionCache.invalidate(userId);
    }

    protected Mono<Long> fetchTokenVersionLive(UUID userId) {
        String path = "/api/auth/internal/users/" + userId + "/token-version";
        String timestamp = String.valueOf(Instant.now().getEpochSecond());
        String signature = InternalRequestProof.sign(internalAuthSecret, "api-gateway", "GET", path, timestamp);

        return webClientBuilder.build()
                .get()
                .uri("lb://auth-service" + path)
                .header("X-Caller-Service", "api-gateway")
                .header("X-Internal-Timestamp", timestamp)
                .header("X-Internal-Signature", signature)
                .retrieve()
                .bodyToMono(TokenVersionResponse.class)
                .switchIfEmpty(Mono.error(new IllegalStateException("Empty token version response")))
                .map(TokenVersionResponse::tokenVersion);
    }

    private static String requireInternalSecret(String internalAuthSecret) {
        if (internalAuthSecret == null || internalAuthSecret.isBlank()) {
            throw new IllegalStateException("internal-auth.secret must be configured");
        }
        return internalAuthSecret;
    }

    private record TokenVersionResponse(UUID userId, long tokenVersion) {
    }
}
