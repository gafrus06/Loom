package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionDayDto {
    private int dayNumber;
    private LocalDate date;
    private boolean today;
    private boolean past;
    private boolean future;
}
