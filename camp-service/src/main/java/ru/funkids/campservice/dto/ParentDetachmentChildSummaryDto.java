package ru.funkids.campservice.dto;

import lombok.*;
import ru.funkids.campservice.entity.Gender;

import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentDetachmentChildSummaryDto {
    private UUID childId;
    private String firstName;
    private String lastName;
    private LocalDate birthDate;
    private Gender gender;
    private boolean belongsToCurrentParent;
    private String relation;
}
