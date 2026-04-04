package ru.funkids.campservice.dto;

import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeniorCounselorNoticeAttachmentResponseDto {
    private UUID id;
    private UUID fileId;
    private String originalFileName;
    private UUID uploadedByUserId;
    private OffsetDateTime createdAt;
}
