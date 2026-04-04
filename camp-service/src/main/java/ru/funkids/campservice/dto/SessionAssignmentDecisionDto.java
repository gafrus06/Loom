package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionAssignmentDecisionDto {
    @NotNull
    private UUID assignmentId;
}
