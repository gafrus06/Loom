package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class MembershipAddDto {
    @NotNull(message = "Detachment ID is required")
    private UUID detachmentId;

    @NotNull(message = "Child ID is required")
    private UUID childId;

    private String notes;
}