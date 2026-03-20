package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialUsageDto {
    private UUID id;
    private UUID detachmentId;
    private UUID materialId;
    private String materialType;
    private OffsetDateTime usedAt;
    private String stage;
    private UUID usedBy;
    private String notes;

    // Для отображения
    private String materialTitle;
}