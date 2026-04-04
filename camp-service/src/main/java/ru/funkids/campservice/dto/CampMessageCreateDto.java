package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import ru.funkids.campservice.entity.CampMessageType;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampMessageCreateDto {
    private UUID campId;
    private UUID sessionId;
    private UUID detachmentId;
    private UUID receiverUserId;
    private CampMessageType messageType;
    private boolean anonymous;
    @NotBlank
    private String text;
}
