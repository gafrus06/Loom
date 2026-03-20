package ru.funkids.campservice.dto;

import java.util.UUID;

// ── Подтверждение вожатым ──────────────────────────────────────────
public record ChildApplicationConfirmDto(
        UUID detachmentId  // в какой отряд добавить ребёнка
) {}
