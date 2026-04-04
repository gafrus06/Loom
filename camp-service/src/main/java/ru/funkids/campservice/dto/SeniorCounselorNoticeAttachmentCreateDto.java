package ru.funkids.campservice.dto;

import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeniorCounselorNoticeAttachmentCreateDto {
    private UUID fileId;
    private String originalFileName;
}
