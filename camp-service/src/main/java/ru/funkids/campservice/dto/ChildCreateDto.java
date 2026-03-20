package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import ru.funkids.campservice.entity.Gender;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ChildCreateDto {
    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    @NotNull(message = "Birth date is required")
    private LocalDate birthDate;

    private Gender gender;
    private String homeCity;

    @NotNull(message = "Detachment ID is required")
    private UUID detachmentId; // для автоматического добавления в отряд
}