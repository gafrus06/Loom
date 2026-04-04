package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftTaskAttachmentCreateDto {
    @NotNull
    private UUID fileId;
    private String originalFileName;
}
