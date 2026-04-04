package ru.fun.authservice.dto;

import java.util.UUID;

public record TokenVersionResponse(UUID userId, long tokenVersion) {
}
