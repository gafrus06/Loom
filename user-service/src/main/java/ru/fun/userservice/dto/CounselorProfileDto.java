package ru.fun.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CounselorProfileDto {

    private String     specialization;
    private Long       experienceYears;
    private String     bio;
    private String     educationDocumentIds;
    private String     telegram;
    private String     shiftPreference;
    private Integer    countOfCompletedShifts;
    private BigDecimal rating;
    private Integer    ratingCount;
}