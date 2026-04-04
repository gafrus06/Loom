package ru.funkids.campservice.dto;

import lombok.*;
import ru.funkids.campservice.entity.Gender;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentOwnChildDetailsDto {
    private UUID childId;
    private String firstName;
    private String lastName;
    private LocalDate birthDate;
    private Gender gender;
    private String homeCity;
    private String allergies;
    private String specialNeeds;
    private String behavioralNotes;
}
