package ru.funkids.campservice.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShiftAnalyticsSummaryDto {
    private UUID sessionId;
    private String sessionTitle;
    private long totalDetachments;
    private long totalChildren;
    private long acceptedAssignments;
    private long pendingAssignments;
    private long reportsCount;
    private long totalTasks;
    private long completedTasks;
    private List<AllergyStatDto> allergyStats;
}
