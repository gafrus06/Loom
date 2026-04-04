package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftTaskCompletionUpsertDto {
    @NotNull
    private UUID taskId;
    private UUID detachmentId;
    private boolean completed;
    private String comment;
}
