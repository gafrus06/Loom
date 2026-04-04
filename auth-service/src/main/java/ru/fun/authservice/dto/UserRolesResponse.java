package ru.fun.authservice.dto;

import java.util.List;
import java.util.UUID;

/**
 * Ответ на GET /api/auth/users/{userId}/roles
 * Используется Feign-клиентами в других сервисах.
 */
public record UserRolesResponse(
        UUID           userId,
        List<UserRoleDto> roles
) {
    /**
     * Возвращает только строки ролей — для удобства в других сервисах.
     */
    public List<String> getRoleNames() {
        return roles.stream().map(UserRoleDto::role).toList();
    }
}