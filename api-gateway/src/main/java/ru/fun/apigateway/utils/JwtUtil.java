package ru.fun.apigateway.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Утилита для работы с JWT на уровне Gateway.
 * Gateway только ЧИТАЕТ и ВАЛИДИРУЕТ токены — не генерирует.
 * Генерация токенов — ответственность Auth-сервиса.
 */
@Component
public class JwtUtil {

    private final String secret;

    public JwtUtil(@Value("${jwt.secret}") String secret) {
        this.secret = secret;
    }

    /**
     * Проверяет подпись и срок действия токена.
     * Если токен просрочен или подпись не совпадает — вернёт false.
     */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public String extractId(String token) {
        return parseClaims(token).get("id", String.class);
    }

    public Set<String> extractRoles(String token) {
        List<?> roles = parseClaims(token).get("roles", List.class);
        if (roles == null) return Set.of();
        return roles.stream().map(Object::toString).collect(Collectors.toSet());
    }

    public long extractTokenVersion(String token) {
        Number tokenVersion = parseClaims(token).get("tv", Number.class);
        return tokenVersion == null ? 0L : tokenVersion.longValue();
    }

    // ─── PRIVATE ─────────────────────────────────────────────────────────────

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .setSigningKey(getSignInKey())
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
