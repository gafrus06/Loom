package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.funkids.campservice.entity.DailyReportStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetachmentDailyReportResponseDto {
    private UUID id;
    private UUID detachmentId;
    private UUID sessionId;
    private UUID reportTemplateId;
    private String reportTemplateTitle;
    private UUID createdByCounselorId;
    private LocalDate reportDate;
    private String dataJson;
    private DailyReportStatus status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
