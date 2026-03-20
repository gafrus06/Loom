// dto/client/ParentLinkDto.java
package ru.funkids.newsfeedservice.dto.client;

import lombok.Data;

import java.util.UUID;

@Data
public class ParentLinkDto {
    private UUID id;
    private UUID childId;
    private UUID parentUserId;
    private String relation;
}