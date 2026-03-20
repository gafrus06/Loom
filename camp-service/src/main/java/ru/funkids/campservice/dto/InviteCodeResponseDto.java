package ru.funkids.campservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record InviteCodeResponseDto(
        UUID id,
        UUID campId,
        UUID sessionId,
        String code,
        boolean active,
        OffsetDateTime createdAt
) {}