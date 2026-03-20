package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.funkids.campservice.entity.DetachmentRole;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CounselorAssignmentResponseDto {

    private UUID id;

    private UUID detachmentId;
    private String detachmentName;

    private UUID sessionId;
    private String sessionName;

    private UUID campId;
    private String campName;

    private UUID userId;

    /** LEAD или ASSISTANT */
    private DetachmentRole roleInDetachment;

    private boolean active;
    private OffsetDateTime assignedAt;
}