package ru.funkids.campservice.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftTaskChecklistItemResponseDto {
    private UUID id;
    private String title;
    private boolean required;
    private Integer sortOrder;
}
