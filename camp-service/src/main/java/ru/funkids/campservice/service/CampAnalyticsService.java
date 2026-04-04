package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.CampAnalyticsSummaryDto;
import ru.funkids.campservice.dto.ShiftAnalyticsSummaryDto;

import java.util.UUID;

public interface CampAnalyticsService {
    CampAnalyticsSummaryDto getCampSummary(UUID campId, UUID actorUserId);
    ShiftAnalyticsSummaryDto getShiftSummary(UUID sessionId, UUID actorUserId);
}
