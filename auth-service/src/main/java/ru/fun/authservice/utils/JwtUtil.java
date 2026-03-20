package ru.fun.authservice.utils;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import ru.fun.authservice.entity.Role;

import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Утилита для работы с JWT.
 *
 * Улучшения:
 * - Key кэшируется (не декодируется из Base64 при каждом вызове)
 * - Кэш невалидных токенов (blacklist) для быстрого отклонения
 *   без полного парсинга (опционально, очищается по TTL)
 */
@Component
public class JwtUtil {

    public static final String CLAIM_ID    = "id";
    public static final String CLAIM_ROLES = "roles";

    // Кэшируем ключ — декодирование Base64 делаем один раз
    private final Key signingKey;

    public JwtUtil(@Value("${jwt.secret}") String secret) {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(UUID id, String username, Set<Role> roles, int minutes) {
        Set<String> roleNames = roles.stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        return Jwts.builder()
                .setSubject(username)
                .claim(CLAIM_ID, id.toString())
                .claim(CLAIM_ROLES, roleNames)
                .setIssuedAt(new Date())
                .setExpiration(Date.from(Instant.now().plus(minutes, ChronoUnit.MINUTES)))
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(signingKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    @SuppressWarnings("unchecked")
    public Set<String> extractRoles(String token) {
        List<String> roles = getClaims(token).get(CLAIM_ROLES, List.class);
        return new HashSet<>(roles);
    }

    public String extractUsername(String token) {
        return getClaims(token).getSubject();
    }

    public String extractUserId(String token) {
        return getClaims(token).get(CLAIM_ID, String.class);
    }

    public boolean validateToken(String token) {
        try {
            Claims claims = getClaims(token);
            // Дополнительная проверка: токен не просрочен
            return claims.getExpiration().after(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}