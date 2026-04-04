package ru.funkids.campservice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import ru.funkids.campservice.entity.ShiftTaskType;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftTaskCreateDto {
    @NotNull
    private UUID campId;
    @NotNull
    private UUID sessionId;
    private UUID detachmentId;
    @NotNull
    private ShiftTaskType taskType;
    @NotNull
    private LocalDate targetDate;
    @NotBlank
    private String title;
    private String description;
    @Valid
    @Builder.Default
    private List<ShiftTaskChecklistItemCreateDto> checklistItems = new ArrayList<>();
    @Valid
    @Builder.Default
    private List<ShiftTaskAttachmentCreateDto> attachments = new ArrayList<>();
}
