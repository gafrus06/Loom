// dto/client/DetachmentDto.java
package ru.funkids.newsfeedservice.dto.client;

import lombok.Data;

import java.util.UUID;

@Data
public class DetachmentDto {
    private UUID id;
    private String name;
    private String ageGroup;
    private UUID sessionId;
    private String sessionName;
    private UUID campId;
    private String campName;
}