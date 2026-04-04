package ru.fun.authservice.utils;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Set;
import java.util.UUID;

/**
 * Генерация JWT в auth-service.
 *
 * Access token содержит:
 *   - sub   : email пользователя
 *   - id    : UUID пользователя
 *   - roles : список активных ролей (["ROLE_USER", "ROLE_ADMIN", ...])
 *
 * Refresh token содержит только:
 *   - sub   : userId (не email — минимум данных)
 *   - id    : userId
 *   Роли не включаются — refresh нужен только для ротации, не для авторизации.
 *
 * Gateway читает access token и проставляет заголовки X-User-Id, X-User-Name, X-User-Roles.
 * Микросервисы читают только заголовки — JWT не парсят.
 */
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    /**
     * Генерирует access token с ролями пользователя.
     *
     * @param userId        UUID пользователя
     * @param email         email пользователя (subject)
     * @param roles         активные роли (например {"ROLE_USER", "ROLE_ADMIN"})
     * @param validMinutes  время жизни в минутах
     */
    public String generateAccessToken(UUID userId, String email, Set<String> roles, long tokenVersion, int validMinutes) {
        Instant now    = Instant.now();
        Instant expiry = now.plus(validMinutes, ChronoUnit.MINUTES);

        return Jwts.builder()
                .setSubject(email)
                .claim("id",    userId.toString())
                .claim("roles", roles)
                .claim("tv", tokenVersion)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiry))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Генерирует refresh token — минимум данных, только userId.
     *
     * @param userId       UUID пользователя
     * @param validMinutes время жизни в минутах
     */
    public String generateRefreshToken(UUID userId, long tokenVersion, int validMinutes) {
        Instant now    = Instant.now();
        Instant expiry = now.plus(validMinutes, ChronoUnit.MINUTES);

        return Jwts.builder()
                .setSubject(userId.toString())
                .claim("id",   userId.toString())
                .claim("type", "refresh")
                .claim("tv", tokenVersion)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiry))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public long extractTokenVersion(String token) {
        Number tokenVersion = parseClaims(token).get("tv", Number.class);
        return tokenVersion == null ? 0L : tokenVersion.longValue();
    }

    public UUID extractUserId(String token) {
        String userId = parseClaims(token).get("id", String.class);
        return UUID.fromString(userId);
    }

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
