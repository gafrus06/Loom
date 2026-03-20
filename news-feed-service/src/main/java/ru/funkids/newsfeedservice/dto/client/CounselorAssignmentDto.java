// dto/client/CounselorAssignmentDto.java
package ru.funkids.newsfeedservice.dto.client;

import lombok.Data;

import java.util.UUID;

@Data
public class CounselorAssignmentDto {
    private UUID id;
    private UUID detachmentId;
    private UUID userId;
    private String roleInDetachment;
    private boolean active;
}