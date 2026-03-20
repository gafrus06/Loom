package ru.funkids.newsfeedservice.security;

import lombok.experimental.UtilityClass;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.funkids.newsfeedservice.exception.UnauthorizedException;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@UtilityClass
public class SecurityUtils {

    // Чем выше индекс — тем приоритетнее роль
    private static final List<String> ROLE_PRIORITY = List.of("USER", "PARENT", "COUNSELOR", "ADMIN");

    public UUID getCurrentUserId() {
        return getPrincipal().getUserId();
    }

    /** Возвращает наиболее привилегированную роль пользователя. */
    public String getCurrentUserRole() {
        Set<String> roles = getPrincipal().getRoles();
        if (roles == null || roles.isEmpty()) return "USER";

        List<String> normalized = roles.stream()
                .map(r -> r.startsWith("ROLE_") ? r.substring(5) : r)
                .toList();

        return ROLE_PRIORITY.stream()
                .filter(normalized::contains)
                .reduce((first, second) -> second)   // последний = наивысший приоритет
                .orElse(normalized.get(0));
    }

    /** Возвращает все роли пользователя как есть (с ROLE_ префиксом или без). */
    public Set<String> getCurrentUserRoles() {
        Set<String> roles = getPrincipal().getRoles();
        return roles != null ? roles : Set.of();
    }

    private GatewayUserPrincipal getPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new UnauthorizedException("User not authenticated");
        }
        if (auth.getPrincipal() instanceof GatewayUserPrincipal principal) {
            return principal;
        }
        throw new UnauthorizedException("Could not extract user principal");
    }
}