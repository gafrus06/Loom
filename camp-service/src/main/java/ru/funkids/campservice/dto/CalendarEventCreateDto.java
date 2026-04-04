package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarEventCreateDto {
    @NotNull
    private UUID campId;
    @NotNull
    private UUID sessionId;
    @NotNull
    private LocalDate eventDate;
    @NotBlank
    private String title;
    private String description;
    private boolean visibleForParents;
}
