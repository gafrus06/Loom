package ru.funkids.campservice.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class SessionUpdateDto {
    private String title;
    private LocalDate startDate;
    private LocalDate endDate;
    private String notes;
}