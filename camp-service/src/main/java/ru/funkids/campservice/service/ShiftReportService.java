package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.*;

import java.util.List;
import java.util.UUID;

public interface ShiftReportService {

    ShiftReportTemplateResponseDto createTemplate(UUID campId, ShiftReportTemplateCreateDto dto, UUID userId);

    List<ShiftReportTemplateResponseDto> listTemplates(UUID campId, UUID sessionId, UUID userId);

    ShiftReportTemplateResponseDto deactivateTemplate(UUID templateId, UUID userId);

    DetachmentDailyReportResponseDto upsertDailyReport(UUID detachmentId, DetachmentDailyReportCreateDto dto, UUID userId);

    List<DetachmentDailyReportResponseDto> listDetachmentReports(UUID detachmentId, UUID userId);

    List<DetachmentDailyReportResponseDto> listSessionReports(UUID campId, UUID sessionId, UUID userId);
}
