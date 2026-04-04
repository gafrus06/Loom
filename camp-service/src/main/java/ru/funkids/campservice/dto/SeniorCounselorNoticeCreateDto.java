package ru.funkids.campservice.dto;

import lombok.*;
import ru.funkids.campservice.entity.SeniorInfoScope;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeniorCounselorNoticeCreateDto {
    private UUID campId;
    private UUID sessionId;
    private UUID detachmentId;
    private SeniorInfoScope scope;
    private String title;
    private String body;
    private List<SeniorCounselorNoticeAttachmentCreateDto> attachments;
}
