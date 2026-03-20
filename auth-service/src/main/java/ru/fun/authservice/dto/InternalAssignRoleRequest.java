package ru.fun.authservice.dto;

import java.util.UUID;

public record InternalAssignRoleRequest(UUID userId, String role) {}