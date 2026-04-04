package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import ru.funkids.campservice.entity.DailyReportStatus;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class DetachmentDailyReportCreateDto {

    @NotNull(message = "Template ID is required")
    private UUID reportTemplateId;

    @NotNull(message = "Report date is required")
    private LocalDate reportDate;

    @NotBlank(message = "dataJson is required")
    private String dataJson;

    private DailyReportStatus status;
}
