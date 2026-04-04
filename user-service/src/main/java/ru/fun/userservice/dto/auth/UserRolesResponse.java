package ru.fun.userservice.dto.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Ответ auth-service на GET /api/auth/users/{userId}/roles.
 *
 * Структура изменилась: раньше был List<String> role,
 * теперь List<UserRoleDto> roles с метаданными назначения.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserRolesResponse {

    private UUID userId;
    private List<UserRoleDto> roles;

    /**
     * Удобный метод — возвращает только строки ролей.
     * Используется там, где нужны просто роли без метаданных.
     */
    public List<String> getRoleNames() {
        if (roles == null) return List.of();
        return roles.stream().map(UserRoleDto::getRole).toList();
    }

    // ── Вложенный DTO одного назначения роли ─────────────────────────────────

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UserRoleDto {
        private UUID id;
        private String role;
        private UUID assignedByUserId;
        private Instant assignedAt;
    }
}