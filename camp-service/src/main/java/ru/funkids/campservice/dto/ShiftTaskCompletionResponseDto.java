package ru.funkids.campservice.dto;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftTaskCompletionResponseDto {
    private UUID id;
    private UUID taskId;
    private UUID counselorUserId;
    private UUID detachmentId;
    private boolean completed;
    private OffsetDateTime completedAt;
    private String comment;
}
