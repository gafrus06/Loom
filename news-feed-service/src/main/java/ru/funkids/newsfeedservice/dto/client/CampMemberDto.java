// dto/client/CampMemberDto.java
package ru.funkids.newsfeedservice.dto.client;

import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class CampMemberDto {
    private UUID id;
    private UUID campId;
    private UUID userId;
    private String role; // COUNSELOR, ADMIN
    private boolean active;
    private OffsetDateTime joinedAt;
    private OffsetDateTime leftAt;

    // Дополнительная информация
    private String campName;
    private String userEmail;
    private String userFirstName;
    private String userLastName;
}