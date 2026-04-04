package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.repository.*;
import ru.funkids.campservice.security.DetachmentSecurityService;
import ru.funkids.campservice.service.CampNotificationService;
import ru.funkids.campservice.service.ShiftReportService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShiftReportServiceImpl implements ShiftReportService {

    private final ShiftReportTemplateRepository shiftReportTemplateRepository;
    private final DetachmentDailyReportRepository detachmentDailyReportRepository;
    private final CampRepository campRepository;
    private final SessionRepository sessionRepository;
    private final DetachmentRepository detachmentRepository;
    private final CampMemberRepository campMemberRepository;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final DetachmentSecurityService detachmentSecurityService;
    private final CampNotificationService campNotificationService;

    @Override
    @Transactional
    public ShiftReportTemplateResponseDto createTemplate(UUID campId, ShiftReportTemplateCreateDto dto, UUID userId) {
        Camp camp = campRepository.findById(campId)
                .orElseThrow(() -> new IllegalArgumentException("Лагерь не найден: " + campId));

        Session session = null;
        if (dto.getSessionId() != null) {
            session = sessionRepository.findById(dto.getSessionId())
                    .orElseThrow(() -> new IllegalArgumentException("Смена не найдена: " + dto.getSessionId()));
            if (!session.getCamp().getId().equals(campId)) {
                throw new IllegalArgumentException("Смена не принадлежит указанному лагерю");
            }
        }

        checkCanManageTemplates(campId, dto.getSessionId(), userId);

        ShiftReportTemplate template = ShiftReportTemplate.builder()
                .camp(camp)
                .session(session)
                .createdByUserId(userId)
                .title(dto.getTitle())
                .fieldsSchema(dto.getFieldsSchema())
                .active(true)
                .build();

        return toTemplateDto(shiftReportTemplateRepository.save(template));
    }

    @Override
    public List<ShiftReportTemplateResponseDto> listTemplates(UUID campId, UUID sessionId, UUID userId) {
        checkCanViewTemplates(campId, sessionId, userId);

        List<ShiftReportTemplate> templates = sessionId == null
                ? shiftReportTemplateRepository.findByCampIdAndActiveTrueOrderByCreatedAtDesc(campId)
                : shiftReportTemplateRepository.findAvailableForSession(campId, sessionId);

        return templates.stream().map(this::toTemplateDto).toList();
    }

    @Override
    @Transactional
    public ShiftReportTemplateResponseDto deactivateTemplate(UUID templateId, UUID userId) {
        ShiftReportTemplate template = shiftReportTemplateRepository.findByIdAndActiveTrue(templateId)
                .orElseThrow(() -> new IllegalArgumentException("Шаблон отчёта не найден: " + templateId));

        UUID campId = template.getCamp().getId();
        UUID sessionId = template.getSession() != null ? template.getSession().getId() : null;
        checkCanManageTemplates(campId, sessionId, userId);

        template.setActive(false);
        return toTemplateDto(shiftReportTemplateRepository.save(template));
    }

    @Override
    @Transactional
    public DetachmentDailyReportResponseDto upsertDailyReport(UUID detachmentId, DetachmentDailyReportCreateDto dto, UUID userId) {
        detachmentSecurityService.checkCanModifyDetachment(detachmentId, userId);

        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));

        ShiftReportTemplate template = shiftReportTemplateRepository.findByIdAndActiveTrue(dto.getReportTemplateId())
                .orElseThrow(() -> new IllegalArgumentException("Шаблон отчёта не найден: " + dto.getReportTemplateId()));

        UUID campId = detachment.getSession().getCamp().getId();
        UUID sessionId = detachment.getSession().getId();

        if (!template.getCamp().getId().equals(campId)) {
            throw new IllegalArgumentException("Шаблон отчёта принадлежит другому лагерю");
        }
        if (template.getSession() != null && !template.getSession().getId().equals(sessionId)) {
            throw new IllegalArgumentException("Шаблон отчёта не подходит для этой смены");
        }

        DetachmentDailyReport report = detachmentDailyReportRepository
                .findByDetachmentIdAndReportDate(detachmentId, dto.getReportDate())
                .orElseGet(() -> DetachmentDailyReport.builder()
                        .detachment(detachment)
                        .session(detachment.getSession())
                        .reportDate(dto.getReportDate())
                        .createdByCounselorId(userId)
                        .build());

        report.setReportTemplate(template);
        report.setDataJson(dto.getDataJson());
        report.setStatus(dto.getStatus() != null ? dto.getStatus() : DailyReportStatus.SUBMITTED);
        report.setCreatedByCounselorId(userId);

        DetachmentDailyReport saved = detachmentDailyReportRepository.save(report);

        campMemberSessionRepository.findBySessionIdAndAssignmentStatusAndActiveTrue(sessionId, AssignmentStatus.ACCEPTED)
                .stream()
                .filter(a -> a.getSubRole() == StaffSubRole.SENIOR_COUNSELOR)
                .forEach(a -> campNotificationService.notifyUser(
                        a.getCampMember().getUserId(),
                        "DAILY_REPORT_SUBMITTED",
                        "Поступил новый отчёт отряда",
                        detachment.getName() + " — " + dto.getReportDate(),
                        "DETACHMENT_DAILY_REPORT",
                        saved.getId(),
                        Map.of("detachmentId", detachment.getId().toString())
                ));

        return toReportDto(saved);
    }

    @Override
    public List<DetachmentDailyReportResponseDto> listDetachmentReports(UUID detachmentId, UUID userId) {
        detachmentSecurityService.checkCanViewDetachment(detachmentId, userId);
        return detachmentDailyReportRepository.findByDetachmentIdOrderByReportDateDescCreatedAtDesc(detachmentId)
                .stream()
                .map(this::toReportDto)
                .toList();
    }

    @Override
    public List<DetachmentDailyReportResponseDto> listSessionReports(UUID campId, UUID sessionId, UUID userId) {
        checkCanManageTemplates(campId, sessionId, userId);
        return detachmentDailyReportRepository.findBySessionIdOrderByReportDateDescCreatedAtDesc(sessionId)
                .stream()
                .map(this::toReportDto)
                .toList();
    }

    private void checkCanManageTemplates(UUID campId, UUID sessionId, UUID userId) {
        if (isCampAdmin(campId, userId)) {
            return;
        }

        if (sessionId != null && campMemberSessionRepository.existsAcceptedBySessionIdAndUserIdAndCampIdAndSubRole(
                sessionId, userId, campId, StaffSubRole.SENIOR_COUNSELOR)) {
            return;
        }

        throw new AccessDeniedException("Недостаточно прав для управления шаблонами и отчётами");
    }

    private void checkCanViewTemplates(UUID campId, UUID sessionId, UUID userId) {
        if (isCampAdmin(campId, userId)) {
            return;
        }

        if (sessionId != null && campMemberSessionRepository.existsAcceptedBySessionIdAndUserIdAndCampId(
                sessionId, userId, campId)) {
            return;
        }

        throw new AccessDeniedException("Нет прав на просмотр шаблонов отчётов");
    }

    private boolean isCampAdmin(UUID campId, UUID userId) {
        return campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(campId, userId, CampRole.OWNER);
    }

    private ShiftReportTemplateResponseDto toTemplateDto(ShiftReportTemplate template) {
        return ShiftReportTemplateResponseDto.builder()
                .id(template.getId())
                .campId(template.getCamp().getId())
                .sessionId(template.getSession() != null ? template.getSession().getId() : null)
                .createdByUserId(template.getCreatedByUserId())
                .title(template.getTitle())
                .fieldsSchema(template.getFieldsSchema())
                .active(template.isActive())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }

    private DetachmentDailyReportResponseDto toReportDto(DetachmentDailyReport report) {
        return DetachmentDailyReportResponseDto.builder()
                .id(report.getId())
                .detachmentId(report.getDetachment().getId())
                .sessionId(report.getSession().getId())
                .reportTemplateId(report.getReportTemplate().getId())
                .reportTemplateTitle(report.getReportTemplate().getTitle())
                .createdByCounselorId(report.getCreatedByCounselorId())
                .reportDate(report.getReportDate())
                .dataJson(report.getDataJson())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }
}
