package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class DetachmentJournalUpsertDto {

    @NotNull(message = "Journal date is required")
    private LocalDate journalDate;

    private String participationInfo;
    private String adaptationInfo;
    private String conflictInfo;
    private String successInfo;
    private String activityLevel;
    private String notes;
    private String visibleForParentsVersion;
}
