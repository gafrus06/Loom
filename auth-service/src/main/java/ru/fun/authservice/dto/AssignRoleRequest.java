package ru.fun.authservice.dto;

/**
 * Тело запроса на назначение роли.
 * POST /api/auth/users/{targetUserId}/roles
 */
public record AssignRoleRequest(
        String role   // например "ROLE_ADMIN", "ROLE_COUNSELOR"
) {}