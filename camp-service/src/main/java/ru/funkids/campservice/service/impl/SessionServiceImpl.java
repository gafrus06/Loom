package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.entity.AssignmentStatus;
import ru.funkids.campservice.entity.Camp;
import ru.funkids.campservice.entity.CampMemberSession;
import ru.funkids.campservice.entity.CampSettings;
import ru.funkids.campservice.entity.Session;
import ru.funkids.campservice.entity.StaffSubRole;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.CampMemberSessionRepository;
import ru.funkids.campservice.repository.CampSettingsRepository;
import ru.funkids.campservice.repository.CampRepository;
import ru.funkids.campservice.repository.SessionRepository;
import ru.funkids.campservice.security.CampSecurityService;
import ru.funkids.campservice.service.SessionService;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;
    private final CampRepository campRepository;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final CampSettingsRepository campSettingsRepository;
    private final CampSecurityService campSecurityService;

    @Override
    public SessionResponseDto create(SessionCreateDto dto) {
        log.info("Creating session: {} for camp: {}", dto.getTitle(), dto.getCampId());

        Camp camp = campRepository.findById(dto.getCampId())
                .orElseThrow(() -> new ResourceNotFoundException("Camp not found: " + dto.getCampId()));

        Session session = Session.builder()
                .title(dto.getTitle())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .camp(camp)
                .build();

        Session saved = sessionRepository.save(session);
        log.info("Session created with id: {}", saved.getId());

        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public SessionResponseDto get(UUID id) {
        log.info("Getting session with id: {}", id);
        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + id));
        return mapToDto(session);
    }

    @Override
    public SessionResponseDto update(UUID id, SessionUpdateDto dto) {
        log.info("Updating session: {}", id);
        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + id));

        if (dto.getTitle() != null) {
            session.setTitle(dto.getTitle());
        }
        if (dto.getStartDate() != null) {
            session.setStartDate(dto.getStartDate());
        }
        if (dto.getEndDate() != null) {
            session.setEndDate(dto.getEndDate());
        }

        Session updated = sessionRepository.save(session);
        log.info("Session updated: {}", id);
        return mapToDto(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionResponseDto> listByCamp(UUID campId) {
        log.info("Listing sessions for camp: {}", campId);
        return sessionRepository.findByCampId(campId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public void delete(UUID id) {
        log.info("Deleting session: {}", id);
        sessionRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public SessionContextDto getSessionContext(UUID sessionId, UUID userId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found: " + sessionId));

        UUID campId = session.getCamp().getId();
        CampMemberSession acceptedAssignment = campMemberSessionRepository
                .findByCampMemberUserIdAndAssignmentStatusAndActiveTrue(userId, AssignmentStatus.ACCEPTED)
                .stream()
                .filter(cms -> cms.getSession().getId().equals(sessionId))
                .findFirst()
                .orElse(null);

        CampSettings settings = campSettingsRepository.findByCampId(campId).orElse(null);
        boolean campOwner = campSecurityService.canManageCamp(campId, userId);
        boolean acceptedStaff = acceptedAssignment != null;
        boolean seniorCounselor = acceptedAssignment != null && acceptedAssignment.getSubRole() == StaffSubRole.SENIOR_COUNSELOR;
        boolean medicalWorker = acceptedAssignment != null && acceptedAssignment.getSubRole() == StaffSubRole.MEDICAL_WORKER;

        return SessionContextDto.builder()
                .sessionId(session.getId())
                .campId(campId)
                .campName(session.getCamp().getName())
                .sessionTitle(session.getTitle())
                .mySubRole(acceptedAssignment == null ? null : acceptedAssignment.getSubRole().name())
                .campOwner(campOwner)
                .acceptedStaff(acceptedStaff)
                .seniorCounselor(seniorCounselor)
                .medicalWorker(medicalWorker)
                .canManageCamp(campOwner)
                .canManageCalendar(campSecurityService.canManageCalendar(sessionId, userId))
                .canManageShiftTasks(campSecurityService.canManageShiftTasks(sessionId, userId))
                .canAccessSeniorDashboard(campOwner || seniorCounselor)
                .canOpenCampSettings(campOwner)
                .calendarEnabled(settings != null && settings.isCalendarEnabled())
                .calendarVisibleForParents(settings != null && settings.isCalendarVisibleForParents())
                .postingMode(settings == null ? null : settings.getPostingMode().name())
                .shiftDays(buildShiftDays(session.getStartDate(), session.getEndDate()))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SessionWithRoleDto> listMyAccessibleSessions(UUID userId) {
        log.info("Getting accessible sessions for user: {}", userId);

        Map<UUID, SessionWithRoleDto> sessionsMap = new HashMap<>();

        // 1. Смены лагерей где пользователь - OWNER
        List<Session> ownedSessions = sessionRepository.findSessionsOfOwnedCamps(userId);
        log.debug("Found {} sessions of owned camps", ownedSessions.size());

        for (Session session : ownedSessions) {
            SessionWithRoleDto dto = SessionWithRoleDto.builder()
                    .id(session.getId())
                    .name(session.getTitle())
                    .startDate(session.getStartDate())
                    .endDate(session.getEndDate())
                    .campId(session.getCamp().getId())
                    .campName(session.getCamp().getName())
                    .accessType("CAMP_OWNER")
                    .campOwner(true) // Lombok builder: campOwner(boolean)
                    .assignedCounselor(false)
                    .build();
            sessionsMap.put(session.getId(), dto);
        }

        // 2. Смены лагерей где пользователь - COUNSELOR
        List<Session> assignedSessions = sessionRepository.findSessionsOfAssignedCamps(userId);
        log.debug("Found {} sessions of assigned camps", assignedSessions.size());

        for (Session session : assignedSessions) {
            SessionWithRoleDto existing = sessionsMap.get(session.getId());

            if (existing != null) {
                // Пользователь и OWNER и COUNSELOR лагеря этой смены
                existing.setAccessType("BOTH");
                existing.setAssignedCounselor(true); // Lombok setter: setAssignedCounselor(boolean)
                log.debug("User {} has both roles for session {}", userId, session.getId());
            } else {
                // Только COUNSELOR
                SessionWithRoleDto dto = SessionWithRoleDto.builder()
                        .id(session.getId())
                        .name(session.getTitle())
                        .startDate(session.getStartDate())
                        .endDate(session.getEndDate())
                        .campId(session.getCamp().getId())
                        .campName(session.getCamp().getName())
                        .accessType("ASSIGNED_COUNSELOR")
                        .campOwner(false)
                        .assignedCounselor(true)
                        .build();
                sessionsMap.put(session.getId(), dto);
            }
        }

        List<SessionWithRoleDto> result = new ArrayList<>(sessionsMap.values());

        // Сортируем по дате начала (новые сверху)
        result.sort((a, b) -> {
            if (a.getStartDate() == null) return 1;
            if (b.getStartDate() == null) return -1;
            return b.getStartDate().compareTo(a.getStartDate());
        });

        log.info("Found {} accessible sessions for user {}", result.size(), userId);
        return result;
    }

    private SessionResponseDto mapToDto(Session session) {
        return SessionResponseDto.builder()
                .id(session.getId())
                .campId(session.getCamp().getId())
                .campName(session.getCamp().getName())
                .title(session.getTitle())
                .startDate(session.getStartDate())
                .endDate(session.getEndDate())
                .notes(session.getNotes())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }

    private List<SessionDayDto> buildShiftDays(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || endDate.isBefore(startDate)) {
            return List.of();
        }

        LocalDate today = LocalDate.now();
        List<SessionDayDto> days = new ArrayList<>();
        int dayNumber = 1;
        for (LocalDate date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            days.add(SessionDayDto.builder()
                    .dayNumber(dayNumber++)
                    .date(date)
                    .today(date.equals(today))
                    .past(date.isBefore(today))
                    .future(date.isAfter(today))
                    .build());
        }
        return days;
    }
}
