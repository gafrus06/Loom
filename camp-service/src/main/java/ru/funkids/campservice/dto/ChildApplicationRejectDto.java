package ru.funkids.campservice.dto;

// ── Отклонение вожатым ─────────────────────────────────────────────
public record ChildApplicationRejectDto(
        String reason  // опционально
) {}
