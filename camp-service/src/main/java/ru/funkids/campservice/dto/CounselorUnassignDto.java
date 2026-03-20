package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class CounselorUnassignDto {
    @NotNull(message = "Assignment ID is required")
    private UUID assignmentId;
}