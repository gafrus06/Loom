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
public class DetachmentJournalResponseDto {
    private UUID id;
    private UUID detachmentId;
    private LocalDate journalDate;
    private UUID createdByUserId;
    private UUID updatedByUserId;
    private String participationInfo;
    private String adaptationInfo;
    private String conflictInfo;
    private String successInfo;
    private String activityLevel;
    private String notes;
    private String visibleForParentsVersion;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
