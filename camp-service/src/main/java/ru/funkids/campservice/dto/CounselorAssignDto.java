package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import ru.funkids.campservice.entity.DetachmentRole;

import java.util.UUID;

@Data
public class CounselorAssignDto {

    @NotNull(message = "Detachment ID is required")
    private UUID detachmentId;

    @NotNull(message = "User ID is required")
    private UUID userId;

    /**
     * Роль в отряде: LEAD или ASSISTANT.
     *
     * На практике при добавлении помощника через этот DTO всегда передаётся ASSISTANT.
     * LEAD назначается автоматически при создании отряда (см. DetachmentServiceImpl.create).
     */
    @NotNull(message = "Role in detachment is required")
    private DetachmentRole roleInDetachment;
}