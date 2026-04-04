package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class CampCreateDto {
    @NotBlank(message = "Name is required")
    private String name;

    private String location;
    private String description;
    private UUID photoFileId;
}
