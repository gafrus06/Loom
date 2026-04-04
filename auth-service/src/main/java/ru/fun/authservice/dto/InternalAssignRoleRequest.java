package ru.fun.authservice.dto;

import java.util.UUID;

/**
 * Payload for internal role assignment.
 * The endpoint is protected by the signed internal-proof headers.
 */
public record InternalAssignRoleRequest(
        UUID userId,
        String role
) {
}
