// dto/client/MembershipDto.java
package ru.funkids.newsfeedservice.dto.client;

import lombok.Data;

import java.util.UUID;

@Data
public class MembershipDto {
    private UUID id;
    private UUID childId;
    private UUID detachmentId;
    private boolean active;
}