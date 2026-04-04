package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.*;
import ru.funkids.campservice.security.CampSecurityService;
import ru.funkids.campservice.service.CampNotificationService;
import ru.funkids.campservice.service.SeniorCounselorNoticeService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeniorCounselorNoticeServiceImpl implements SeniorCounselorNoticeService {

    private final SeniorCounselorNoticeRepository noticeRepository;
    private final SeniorCounselorNoticeAttachmentRepository attachmentRepository;
    private final CampRepository campRepository;
    private final SessionRepository sessionRepository;
    private final DetachmentRepository detachmentRepository;
    private final CampSecurityService campSecurityService;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final CampNotificationService campNotificationService;

    @Override
    @Transactional
    public SeniorCounselorNoticeResponseDto create(SeniorCounselorNoticeCreateDto dto, UUID actorUserId) {
        Session session = sessionRepository.findById(dto.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Смена не найдена: " + dto.getSessionId()));
        Camp camp = campRepository.findById(dto.getCampId())
                .orElseThrow(() -> new ResourceNotFoundException("Лагерь не найден: " + dto.getCampId()));

        if (!session.getCamp().getId().equals(camp.getId())) {
            throw new IllegalArgumentException("Смена не принадлежит указанному лагерю");
        }
        if (!campSecurityService.canManageCalendar(session.getId(), actorUserId)) {
            throw new AccessDeniedException("Недостаточно прав для публикации служебной информации");
        }

        Detachment detachment = null;
        if (dto.getScope() == SeniorInfoScope.DETACHMENT) {
            if (dto.getDetachmentId() == null) {
                throw new IllegalArgumentException("Для DETACHMENT scope требуется detachmentId");
            }
            detachment = detachmentRepository.findById(dto.getDetachmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Отряд не найден: " + dto.getDetachmentId()));
            if (!detachment.getSession().getId().equals(session.getId())) {
                throw new IllegalArgumentException("Отряд не относится к указанной смене");
            }
        }

        SeniorCounselorNotice notice = noticeRepository.save(SeniorCounselorNotice.builder()
                .camp(camp)
                .session(session)
                .detachment(detachment)
                .scope(dto.getScope())
                .title(dto.getTitle())
                .body(dto.getBody())
                .createdByUserId(actorUserId)
                .active(true)
                .build());

        saveAttachments(notice, dto.getAttachments(), actorUserId);
        notifyAboutNotice(session, notice);
        return toDto(noticeRepository.findById(notice.getId()).orElseThrow());
    }

    @Override
    @Transactional
    public SeniorCounselorNoticeResponseDto update(UUID noticeId, SeniorCounselorNoticeUpdateDto dto, UUID actorUserId) {
        SeniorCounselorNotice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new ResourceNotFoundException("Служебная информация не найдена: " + noticeId));
        if (!campSecurityService.canManageCalendar(notice.getSession().getId(), actorUserId)) {
            throw new AccessDeniedException("Недостаточно прав для изменения служебной информации");
        }
        notice.setTitle(dto.getTitle());
        notice.setBody(dto.getBody());
        notice.setActive(dto.isActive());
        noticeRepository.save(notice);

        if (dto.getAttachments() != null) {
            attachmentRepository.deleteByNoticeId(noticeId);
            saveAttachments(notice, dto.getAttachments(), actorUserId);
        }
        return toDto(noticeRepository.findById(noticeId).orElseThrow());
    }

    @Override
    @Transactional
    public void deactivate(UUID noticeId, UUID actorUserId) {
        SeniorCounselorNotice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new ResourceNotFoundException("Служебная информация не найдена: " + noticeId));
        if (!campSecurityService.canManageCalendar(notice.getSession().getId(), actorUserId)) {
            throw new AccessDeniedException("Недостаточно прав для деактивации");
        }
        notice.setActive(false);
        noticeRepository.save(notice);
    }

    @Override
    public List<SeniorCounselorNoticeResponseDto> listForSession(UUID sessionId, UUID actorUserId) {
        if (!campSecurityService.canViewSessionTasks(sessionId, actorUserId)) {
            throw new AccessDeniedException("Нет доступа к служебной информации этой смены");
        }
        return noticeRepository.findBySessionIdAndActiveTrueOrderByCreatedAtDesc(sessionId).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public List<SeniorCounselorNoticeResponseDto> listForDetachment(UUID sessionId, UUID detachmentId, UUID actorUserId) {
        if (!campSecurityService.canViewSessionTasks(sessionId, actorUserId)) {
            throw new AccessDeniedException("Нет доступа к служебной информации этой смены");
        }
        return noticeRepository.findBySessionIdAndDetachmentIdAndActiveTrueOrderByCreatedAtDesc(sessionId, detachmentId).stream()
                .map(this::toDto)
                .toList();
    }

    private void saveAttachments(SeniorCounselorNotice notice, List<SeniorCounselorNoticeAttachmentCreateDto> attachments, UUID actorUserId) {
        if (attachments == null || attachments.isEmpty()) {
            return;
        }
        for (SeniorCounselorNoticeAttachmentCreateDto dto : attachments) {
            attachmentRepository.save(SeniorCounselorNoticeAttachment.builder()
                    .notice(notice)
                    .fileId(dto.getFileId())
                    .originalFileName(dto.getOriginalFileName())
                    .uploadedByUserId(actorUserId)
                    .build());
        }
    }

    private void notifyAboutNotice(Session session, SeniorCounselorNotice notice) {
        campMemberSessionRepository.findBySessionIdAndAssignmentStatusAndActiveTrue(session.getId(), AssignmentStatus.ACCEPTED)
                .stream()
                .filter(a -> a.getSubRole() == StaffSubRole.COUNSELOR || a.getSubRole() == StaffSubRole.SENIOR_COUNSELOR)
                .forEach(a -> campNotificationService.notifyUser(
                        a.getCampMember().getUserId(),
                        "SERVICE_NOTICE_CREATED",
                        "Новая служебная информация",
                        notice.getTitle(),
                        "SENIOR_COUNSELOR_NOTICE",
                        notice.getId(),
                        Map.of("sessionId", session.getId().toString())
                ));
    }

    private SeniorCounselorNoticeResponseDto toDto(SeniorCounselorNotice notice) {
        List<SeniorCounselorNoticeAttachmentResponseDto> attachments = attachmentRepository.findByNoticeIdOrderByCreatedAtAsc(notice.getId())
                .stream()
                .map(att -> SeniorCounselorNoticeAttachmentResponseDto.builder()
                        .id(att.getId())
                        .fileId(att.getFileId())
                        .originalFileName(att.getOriginalFileName())
                        .uploadedByUserId(att.getUploadedByUserId())
                        .createdAt(att.getCreatedAt())
                        .build())
                .toList();

        return SeniorCounselorNoticeResponseDto.builder()
                .id(notice.getId())
                .campId(notice.getCamp().getId())
                .sessionId(notice.getSession().getId())
                .detachmentId(notice.getDetachment() == null ? null : notice.getDetachment().getId())
                .scope(notice.getScope())
                .title(notice.getTitle())
                .body(notice.getBody())
                .createdByUserId(notice.getCreatedByUserId())
                .active(notice.isActive())
                .createdAt(notice.getCreatedAt())
                .updatedAt(notice.getUpdatedAt())
                .attachments(attachments)
                .build();
    }
}
