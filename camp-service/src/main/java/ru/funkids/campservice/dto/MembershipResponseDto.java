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
public class MembershipResponseDto {
    private UUID id;
    private UUID detachmentId;
    private UUID childId;
    private OffsetDateTime joinedAt;
    private OffsetDateTime leftAt;
    private String notes;
    private boolean active;
}