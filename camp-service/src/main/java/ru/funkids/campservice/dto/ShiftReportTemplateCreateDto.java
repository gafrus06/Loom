package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class ShiftReportTemplateCreateDto {

    private UUID sessionId;

    @NotBlank(message = "Template title is required")
    private String title;

    @NotBlank(message = "fieldsSchema is required")
    private String fieldsSchema;
}
