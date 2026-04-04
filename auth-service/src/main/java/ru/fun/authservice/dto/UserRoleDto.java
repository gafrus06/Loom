package ru.fun.authservice.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Данные одного назначения роли — возвращается в UserRolesResponse.
 */
public record UserRoleDto(
        UUID    id,
        String  role,
        UUID    assignedByUserId,
        Instant assignedAt
) {}