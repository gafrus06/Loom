package ru.funkids.campservice.dto;

import lombok.*;
import ru.funkids.campservice.entity.AssignmentStatus;
import ru.funkids.campservice.entity.StaffSubRole;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionStaffAssignmentResponseDto {
    private UUID id;
    private UUID userId;
    private UUID sessionId;
    private String sessionTitle;
    private StaffSubRole subRole;
    private AssignmentStatus assignmentStatus;
    private UUID assignedByUserId;
    private OffsetDateTime assignedAt;
    private OffsetDateTime respondedAt;
    private OffsetDateTime autoDetachedAt;
    private boolean active;
}
