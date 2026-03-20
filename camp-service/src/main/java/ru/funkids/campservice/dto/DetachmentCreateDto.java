package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class DetachmentCreateDto {
    @NotNull(message = "Session ID is required")
    private UUID sessionId;

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Age group is required")
    private String ageGroup; // e.g. "7-9", "10-12", "13-15"
}