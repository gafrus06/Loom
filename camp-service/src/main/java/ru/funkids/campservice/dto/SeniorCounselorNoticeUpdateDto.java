package ru.funkids.campservice.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeniorCounselorNoticeUpdateDto {
    private String title;
    private String body;
    private boolean active;
    private List<SeniorCounselorNoticeAttachmentCreateDto> attachments;
}
