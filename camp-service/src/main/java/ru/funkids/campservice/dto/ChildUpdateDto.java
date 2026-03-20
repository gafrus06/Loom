package ru.funkids.campservice.dto;

import lombok.Data;
import ru.funkids.campservice.entity.Gender;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class ChildUpdateDto {
    private String firstName;
    private String lastName;
    private LocalDate birthDate;
    private Gender gender;
    private String homeCity;

    // Медицинские данные (обычно заполняет родитель)
    private String medicalNotes;
    private String allergies;
    private String specialNeeds;
    private String behavioralNotes;

    private UUID avatarFileId;
}