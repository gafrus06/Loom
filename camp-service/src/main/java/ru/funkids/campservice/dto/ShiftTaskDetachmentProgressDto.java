package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftTaskDetachmentProgressDto {
    private UUID detachmentId;
    private String detachmentName;
    private long totalChecklistItems;
    private long completedChecklistItems;
    private double completionPercent;
}
