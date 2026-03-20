package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionResponseDto {
    private UUID id;
    private UUID campId;
    private String campName; // ДОБАВЛЕНО для удобства
    private String title;
    private LocalDate startDate;
    private LocalDate endDate;
    private String notes;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}