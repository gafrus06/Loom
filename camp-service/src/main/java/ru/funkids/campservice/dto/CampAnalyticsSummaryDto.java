package ru.funkids.campservice.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampAnalyticsSummaryDto {
    private UUID campId;
    private long totalSessions;
    private long totalDetachments;
    private long totalChildren;
    private long totalCounselors;
    private long pendingApplications;
    private long acceptedApplications;
    private long reportsCount;
    private long totalTasks;
    private long completedTasks;
    private List<AllergyStatDto> allergyStats;
}
