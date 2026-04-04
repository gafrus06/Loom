package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.CalendarEventCreateDto;
import ru.funkids.campservice.dto.CalendarEventResponseDto;
import ru.funkids.campservice.dto.CalendarEventUpdateDto;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.CalendarEventRepository;
import ru.funkids.campservice.repository.CampSettingsRepository;
import ru.funkids.campservice.repository.SessionRepository;
import ru.funkids.campservice.security.CampSecurityService;
import ru.funkids.campservice.service.AuditEventService;
import ru.funkids.campservice.service.CalendarEventService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CalendarEventServiceImpl implements CalendarEventService {

    private final CalendarEventRepository calendarEventRepository;
    private final SessionRepository sessionRepository;
    private final CampSettingsRepository campSettingsRepository;
    private final CampSecurityService campSecurityService;
    private final AuditEventService auditEventService;

    @Override
    public CalendarEventResponseDto create(CalendarEventCreateDto dto, UUID actorUserId) {
        Session session = sessionRepository.findById(dto.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Смена не найдена: " + dto.getSessionId()));

        validateCampAndSession(dto.getCampId(), session);
        checkCanManageCalendar(session, actorUserId);
        checkCalendarEnabled(dto.getCampId());
        validateDateInsideSession(dto.getEventDate(), session);

        CalendarEvent event = CalendarEvent.builder()
                .camp(session.getCamp())
                .session(session)
                .eventDate(dto.getEventDate())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .createdByUserId(actorUserId)
                .visibleForParents(dto.isVisibleForParents())
                .build();

        CalendarEvent saved = calendarEventRepository.save(event);
        auditEventService.log(
                session.getCamp().getId(),
                "CALENDAR_EVENT_CREATED",
                "Создано событие календаря «" + saved.getTitle() + "»",
                "CALENDAR_EVENT",
                saved.getId(),
                actorUserId,
                Map.of("sessionId", session.getId().toString(), "date", saved.getEventDate().toString())
        );
        return map(saved);
    }

    @Override
    public CalendarEventResponseDto update(UUID eventId, CalendarEventUpdateDto dto, UUID actorUserId) {
        CalendarEvent event = calendarEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Событие не найдено: " + eventId));

        checkCanManageCalendar(event.getSession(), actorUserId);
        checkCalendarEnabled(event.getCamp().getId());

        if (dto.getEventDate() != null) {
            validateDateInsideSession(dto.getEventDate(), event.getSession());
            event.setEventDate(dto.getEventDate());
        }
        if (dto.getTitle() != null) event.setTitle(dto.getTitle());
        if (dto.getDescription() != null) event.setDescription(dto.getDescription());
        if (dto.getVisibleForParents() != null) event.setVisibleForParents(dto.getVisibleForParents());

        CalendarEvent saved = calendarEventRepository.save(event);
        auditEventService.log(
                event.getCamp().getId(),
                "CALENDAR_EVENT_UPDATED",
                "Обновлено событие календаря «" + saved.getTitle() + "»",
                "CALENDAR_EVENT",
                saved.getId(),
                actorUserId,
                Map.of("sessionId", saved.getSession().getId().toString())
        );
        return map(saved);
    }

    @Override
    public void delete(UUID eventId, UUID actorUserId) {
        CalendarEvent event = calendarEventRepository.findById(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Событие не найдено: " + eventId));
        checkCanManageCalendar(event.getSession(), actorUserId);
        calendarEventRepository.delete(event);
        auditEventService.log(
                event.getCamp().getId(),
                "CALENDAR_EVENT_DELETED",
                "Удалено событие календаря «" + event.getTitle() + "»",
                "CALENDAR_EVENT",
                event.getId(),
                actorUserId,
                Map.of("sessionId", event.getSession().getId().toString())
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<CalendarEventResponseDto> listBySession(UUID sessionId, UUID actorUserId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Смена не найдена: " + sessionId));

        boolean canManage = campSecurityService.canManageCalendar(sessionId, actorUserId);
        CampSettings settings = campSettingsRepository.findByCampId(session.getCamp().getId()).orElse(null);
        boolean parentCalendarVisible = settings != null && settings.isCalendarEnabled() && settings.isCalendarVisibleForParents();
        boolean canViewAsParent = parentCalendarVisible && campSecurityService.canParentViewSessionCalendar(sessionId, actorUserId);

        boolean canViewAsStaff = campSecurityService.canViewSessionTasks(sessionId, actorUserId);

        if (canManage || canViewAsStaff) {
            return calendarEventRepository.findBySessionIdOrderByEventDateAsc(sessionId).stream().map(this::map).toList();
        }
        if (canViewAsParent) {
            return calendarEventRepository.findBySessionIdAndVisibleForParentsTrueOrderByEventDateAsc(sessionId).stream().map(this::map).toList();
        }
        throw new IllegalStateException("Нет прав на просмотр календаря этой смены");
    }

    private void validateCampAndSession(UUID campId, Session session) {
        if (!session.getCamp().getId().equals(campId)) {
            throw new IllegalArgumentException("Смена не относится к указанному лагерю");
        }
    }

    private void checkCanManageCalendar(Session session, UUID actorUserId) {
        if (!campSecurityService.canManageCalendar(session.getId(), actorUserId)) {
            throw new IllegalStateException("Только администратор лагеря или старший вожатый смены может управлять календарём");
        }
    }

    private void checkCalendarEnabled(UUID campId) {
        CampSettings settings = campSettingsRepository.findByCampId(campId)
                .orElse(null);
        if (settings == null || !settings.isCalendarEnabled()) {
            throw new IllegalStateException("Календарь для этого лагеря отключён администратором");
        }
    }

    private void validateDateInsideSession(java.time.LocalDate eventDate, Session session) {
        if (eventDate.isBefore(session.getStartDate()) || eventDate.isAfter(session.getEndDate())) {
            throw new IllegalArgumentException("Дата события должна находиться в пределах смены");
        }
    }

    private CalendarEventResponseDto map(CalendarEvent event) {
        return CalendarEventResponseDto.builder()
                .id(event.getId())
                .campId(event.getCamp().getId())
                .campName(event.getCamp().getName())
                .sessionId(event.getSession().getId())
                .sessionTitle(event.getSession().getTitle())
                .eventDate(event.getEventDate())
                .title(event.getTitle())
                .description(event.getDescription())
                .createdByUserId(event.getCreatedByUserId())
                .visibleForParents(event.isVisibleForParents())
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .build();
    }
}
