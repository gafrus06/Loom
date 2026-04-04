package ru.funkids.campservice.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarEventUpdateDto {
    private LocalDate eventDate;
    private String title;
    private String description;
    private Boolean visibleForParents;
}
