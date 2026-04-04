package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftTaskChecklistItemCreateDto {
    @NotBlank
    private String title;
    @Builder.Default
    private boolean required = true;
    @Builder.Default
    private Integer sortOrder = 0;
}
