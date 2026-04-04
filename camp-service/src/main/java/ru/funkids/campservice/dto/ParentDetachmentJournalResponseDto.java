package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.funkids.campservice.entity.DetachmentStage;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentDetachmentJournalResponseDto {
    private UUID id;
    private UUID campId;
    private UUID sessionId;
    private UUID detachmentId;
    private String detachmentName;
    private DetachmentStage detachmentStage;
    private LocalDate journalDate;
    private String activityLevel;
    private String visibleForParentsVersion;
    private Integer childrenCount;
    private OffsetDateTime updatedAt;
}
