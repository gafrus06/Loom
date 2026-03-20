package ru.funkids.campservice.jwt;

import org.springframework.security.core.context.SecurityContextHolder;
import ru.funkids.campservice.security.GatewayUserPrincipal;

import java.util.Collections;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Утилита для извлечения данных из GatewayUserPrincipal.
 * Заменяет старый JwtUtils который работал с Jwt токеном напрямую.
 * Сигнатуры методов сохранены — менять вызовы в сервисах не нужно,
 * только убрать параметр Jwt из контроллеров.
 */
public final class JwtUtils {
    private JwtUtils() {}

    public static UUID userId(GatewayUserPrincipal principal) {
        return principal.getUserId();
    }

    public static String email(GatewayUserPrincipal principal) {
        return principal.getUsername();
    }

    public static Set<String> roles(GatewayUserPrincipal principal) {
        if (principal.getAuthorities() == null) return Collections.emptySet();
        return principal.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .collect(Collectors.toSet());
    }

    /** Получить principal из SecurityContext без параметра */
    public static GatewayUserPrincipal current() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof GatewayUserPrincipal gwp) {
            return gwp;
        }
        throw new IllegalStateException("No authenticated GatewayUserPrincipal in SecurityContext");
    }
}