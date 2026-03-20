package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.funkids.campservice.entity.DetachmentStage;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetachmentResponseDto {
    private UUID id;
    private UUID sessionId;
    private String sessionName; // ДОБАВЛЕНО для удобства
    private UUID campId; // ДОБАВЛЕНО для удобства
    private String campName; // ДОБАВЛЕНО для удобства
    private String name;
    private String ageGroup;
    private DetachmentStage stage;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}