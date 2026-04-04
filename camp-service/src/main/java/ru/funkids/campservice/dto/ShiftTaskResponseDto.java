package ru.funkids.campservice.dto;

import lombok.*;
import ru.funkids.campservice.entity.ShiftTaskType;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftTaskResponseDto {
    private UUID id;
    private UUID campId;
    private String campName;
    private UUID sessionId;
    private String sessionTitle;
    private UUID detachmentId;
    private String detachmentName;
    private ShiftTaskType taskType;
    private LocalDate targetDate;
    private String title;
    private String description;
    private UUID createdByUserId;
    private OffsetDateTime createdAt;
    private long totalExpected;
    private long totalCompleted;
    private double completionPercent;
    private boolean completedByCurrentUser;
    private OffsetDateTime currentUserCompletedAt;
    private String currentUserCompletionComment;
    @Builder.Default
    private List<ShiftTaskChecklistItemResponseDto> checklistItems = new ArrayList<>();
    @Builder.Default
    private List<ShiftTaskAttachmentResponseDto> attachments = new ArrayList<>();
    @Builder.Default
    private List<ShiftTaskDetachmentProgressDto> detachmentProgress = new ArrayList<>();
}
