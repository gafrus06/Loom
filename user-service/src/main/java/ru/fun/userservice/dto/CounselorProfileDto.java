package ru.fun.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.jackson.Jacksonized;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Jacksonized
public class CounselorProfileDto {
    private String specialization;
    private Long experienceYears;
    private String bio;
    private String educationDocumentIds;
    private String telegram;
    private String shiftPreference;
}