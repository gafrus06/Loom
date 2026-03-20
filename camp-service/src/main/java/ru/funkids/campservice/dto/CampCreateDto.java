package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CampCreateDto {
    @NotBlank(message = "Name is required")
    private String name;

    private String location;
    private String description;
}