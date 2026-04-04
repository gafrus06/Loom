package ru.funkids.campservice.dto;

import lombok.*;
import ru.funkids.campservice.entity.CampMessageType;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampMessageResponseDto {
    private UUID id;
    private UUID senderUserId;
    private UUID receiverUserId;
    private UUID campId;
    private UUID sessionId;
    private UUID detachmentId;
    private CampMessageType messageType;
    private boolean anonymous;
    private String text;
    private OffsetDateTime createdAt;
    private OffsetDateTime readAt;
}
