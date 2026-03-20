package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import ru.funkids.campservice.entity.DetachmentStage;

@Data
public class DetachmentChangeStageDto {
    @NotNull(message = "Stage is required")
    private DetachmentStage stage;
}