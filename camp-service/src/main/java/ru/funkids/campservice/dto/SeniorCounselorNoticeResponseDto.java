package ru.funkids.campservice.dto;

import lombok.*;
import ru.funkids.campservice.entity.SeniorInfoScope;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeniorCounselorNoticeResponseDto {
    private UUID id;
    private UUID campId;
    private UUID sessionId;
    private UUID detachmentId;
    private SeniorInfoScope scope;
    private String title;
    private String body;
    private UUID createdByUserId;
    private boolean active;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private List<SeniorCounselorNoticeAttachmentResponseDto> attachments;
}
