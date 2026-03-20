// dto/client/CampDto.java
package ru.funkids.newsfeedservice.dto.client;

import lombok.Data;

import java.util.UUID;

@Data
public class CampDto {
    private UUID id;
    private String name;
    private String description;
    private UUID ownerId;
}