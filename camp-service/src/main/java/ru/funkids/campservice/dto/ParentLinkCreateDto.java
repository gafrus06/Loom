package ru.funkids.campservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class ParentLinkCreateDto {
    @NotNull(message = "Child ID is required")
    private UUID childId;

    @NotNull(message = "Parent user ID is required")
    private UUID parentUserId;

    @Email(message = "Valid email is required")
    private String parentEmail; // для назначения роли PARENT

    @NotBlank(message = "Relation is required")
    private String relation; // Мама/Папа/Опекун
}