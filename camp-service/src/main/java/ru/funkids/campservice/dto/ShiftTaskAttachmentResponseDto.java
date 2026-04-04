package ru.funkids.campservice.dto;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftTaskAttachmentResponseDto {
    private UUID id;
    private UUID fileId;
    private String originalFileName;
    private UUID uploadedByUserId;
    private OffsetDateTime createdAt;
}
