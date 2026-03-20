package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.funkids.campservice.entity.Gender;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChildResponseDto {
    private UUID id;
    private String firstName;
    private String lastName;
    private LocalDate birthDate;
    private int age;
    private Gender gender;
    private String homeCity;

    // Медицинские данные
    private String medicalNotes;
    private String allergies;
    private String specialNeeds;
    private String behavioralNotes;

    private UUID avatarFileId;
    private UUID createdByUserId;
    private boolean parentVerified;

    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}