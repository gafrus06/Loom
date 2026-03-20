package ru.funkids.campservice.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import ru.funkids.campservice.entity.DetachmentStage;

@Data
public class DetachmentStageUpdateDto {

    @NotNull
    @Schema(description = "Новый этап отряда",
            example = "ORGANIZATIONAL",
            required = true,
            allowableValues = {"NEW", "ORGANIZATIONAL", "BUSINESS", "CONSTRUCTIVE", "FINAL", "COMPLETED"})
    private DetachmentStage stage;
}
