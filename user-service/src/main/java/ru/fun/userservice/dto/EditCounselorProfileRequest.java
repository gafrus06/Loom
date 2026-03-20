package ru.fun.userservice.dto;

import lombok.Data;


@Data
public class EditCounselorProfileRequest {
    private String specialization;
    private Long experienceYears;
    private String bio;
    private String educationDocumentIds;
    private String telegram;
    private String shiftPreference;
}