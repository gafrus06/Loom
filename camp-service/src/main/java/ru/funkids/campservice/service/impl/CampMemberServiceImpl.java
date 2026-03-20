package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.CampMemberAssignDto;
import ru.funkids.campservice.dto.CampMemberResponseDto;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.*;
import ru.funkids.campservice.service.AuditEventService;
import ru.funkids.campservice.service.CampMemberService;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CampMemberServiceImpl implements CampMemberService {

    private final CampMemberRepository campMemberRepository;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final CampRepository campRepository;
    private final SessionRepository sessionRepository;
    private final CounselorAssignmentRepository counselorAssignmentRepository;
    private final AuditEventService auditEventService;

    // =========================================================================
    // Назначение вожатого
    // =========================================================================

    /**
     * Назначить вожатого в лагерь и привязать к указанным сменам.
     *
     * Логика:
     * 1. Проверяем, что актор — OWNER данного лагеря.
     * 2. Если вожатый ещё не является членом лагеря — создаём CampMember(COUNSELOR).
     * 3. Для каждой smены из dto.sessionIds создаём CampMemberSession (если ещё нет).
     * 4. Пишем аудит для каждой новой привязки.
     */
    @Override
    public CampMemberResponseDto assignCounselor(CampMemberAssignDto dto, UUID adminId) {
        log.info("Assigning counselor {} to camp {} sessions {} by admin {}",
                dto.getUserId(), dto.getCampId(), dto.getSessionIds(), adminId);

        Camp camp = campRepository.findById(dto.getCampId())
                .orElseThrow(() -> new ResourceNotFoundException("Лагерь не найден: " + dto.getCampId()));

        // Проверяем, что adminId — это OWNER лагеря
        boolean isOwner = campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(
                dto.getCampId(), adminId, CampRole.OWNER)
                || camp.getOwnerId().equals(adminId);

        if (!isOwner) {
            throw new IllegalStateException("Только владелец лагеря может назначать вожатых");
        }

        // Находим или реактивируем запись CampMember для этого вожатого.
        // Важно: ищем среди ВСЕХ записей (активных и неактивных) по (campId, userId),
        // чтобы не нарушить unique constraint uk_camp_members_camp_user при повторном назначении
        // после выхода из лагеря.
        CampMember campMember;
        List<CampMember> existing = campMemberRepository.findByCampIdAndUserId(dto.getCampId(), dto.getUserId());

        if (!existing.isEmpty()) {
            // Запись уже есть (возможно неактивная после leaveCamp) — реактивируем
            campMember = existing.get(0);
            if (!campMember.isActive()) {
                log.info("Reactivating existing CampMember for user {} in camp {}", dto.getUserId(), dto.getCampId());
                campMember.setActive(true);
                campMember.setRemovedAt(null);
                campMember = campMemberRepository.save(campMember);
            }
        } else {
            // Первое назначение — создаём новую запись
            log.info("Creating new CampMember for user {} in camp {}", dto.getUserId(), dto.getCampId());
            campMember = campMemberRepository.save(CampMember.builder()
                    .camp(camp)
                    .userId(dto.getUserId())
                    .role(CampRole.COUNSELOR)
                    .active(true)
                    .build());
        }

        // Привязываем к каждой смене из списка
        List<String> addedSessionNames = new ArrayList<>();

        if (dto.getSessionIds() != null) {
            for (UUID sessionId : dto.getSessionIds()) {
                Session session = sessionRepository.findById(sessionId)
                        .orElseThrow(() -> new ResourceNotFoundException("Смена не найдена: " + sessionId));

                // Проверяем, что смена принадлежит этому лагерю
                if (!session.getCamp().getId().equals(dto.getCampId())) {
                    throw new IllegalArgumentException(
                            "Смена " + sessionId + " не принадлежит лагерю " + dto.getCampId());
                }

                boolean alreadyAssigned = campMemberSessionRepository
                        .existsByCampMemberIdAndSessionId(campMember.getId(), sessionId);

                if (!alreadyAssigned) {
                    CampMemberSession cms = CampMemberSession.builder()
                            .campMember(campMember)
                            .session(session)
                            .build();
                    campMemberSessionRepository.save(cms);
                    addedSessionNames.add("«" + session.getTitle() + "»");
                    log.info("Counselor {} assigned to session {} ({})", dto.getUserId(), sessionId, session.getTitle());
                }
            }
        }

        // Аудит
        if (!addedSessionNames.isEmpty()) {
            String sessionList = String.join(", ", addedSessionNames);
            auditEventService.log(
                    dto.getCampId(),
                    "COUNSELOR_ASSIGNED",
                    "Вожатый назначен на смены " + sessionList + " лагеря «" + camp.getName() + "»",
                    "CAMP_MEMBER",
                    campMember.getId(),
                    adminId,
                    Map.of("counselorUserId", dto.getUserId().toString(),
                            "sessions", dto.getSessionIds().stream().map(UUID::toString).collect(Collectors.toList()))
            );
        }

        return mapToDto(campMember);
    }

    // =========================================================================
    // Отзыв доступа к конкретной смене (без исключения из лагеря)
    // =========================================================================

    /**
     * Отозвать доступ вожатого к конкретной смене.
     * CampMember-запись остаётся активной — вожатый всё ещё в лагере,
     * но теряет доступ к этой смене.
     */
    public void removeFromSession(UUID campId, UUID counselorUserId, UUID sessionId, UUID adminId) {
        log.info("Removing counselor {} from session {} in camp {} by admin {}",
                counselorUserId, sessionId, campId, adminId);

        Camp camp = campRepository.findById(campId)
                .orElseThrow(() -> new ResourceNotFoundException("Лагерь не найден: " + campId));

        boolean isOwner = campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(
                campId, adminId, CampRole.OWNER) || camp.getOwnerId().equals(adminId);
        if (!isOwner) throw new IllegalStateException("Только владелец лагеря может отзывать назначения");

        CampMember campMember = campMemberRepository
                .findByCampIdAndUserIdAndActiveTrue(campId, counselorUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Вожатый не найден в лагере"));

        CampMemberSession cms = campMemberSessionRepository
                .findByCampMemberIdAndSessionId(campMember.getId(), sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Привязка к смене не найдена"));

        Session session = cms.getSession();
        campMemberSessionRepository.delete(cms);

        // Также снимаем вожатого со всех отрядов этой смены
        counselorAssignmentRepository.findByUserIdAndActiveTrue(counselorUserId).stream()
                .filter(a -> a.getDetachment().getSession().getId().equals(sessionId))
                .forEach(a -> {
                    a.setActive(false);
                    a.setRemovedAt(OffsetDateTime.now());
                    counselorAssignmentRepository.save(a);
                    log.info("Auto-removed counselor {} from detachment {} (session removed)",
                            counselorUserId, a.getDetachment().getId());
                });

        auditEventService.log(
                campId,
                "COUNSELOR_SESSION_REMOVED",
                "Вожатый отстранён от смены «" + session.getTitle() + "» лагеря «" + camp.getName() + "»",
                "CAMP_MEMBER",
                campMember.getId(),
                adminId,
                Map.of("counselorUserId", counselorUserId.toString(), "sessionId", sessionId.toString())
        );
    }

    // =========================================================================
    // Полное исключение из лагеря
    // =========================================================================

    @Override
    public void removeCounselor(UUID campId, UUID userId, UUID adminId) {
        log.info("Admin {} removing counselor {} completely from camp {}", adminId, userId, campId);

        Camp camp = campRepository.findById(campId)
                .orElseThrow(() -> new ResourceNotFoundException("Лагерь не найден: " + campId));

        boolean isOwner = campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(
                campId, adminId, CampRole.OWNER) || camp.getOwnerId().equals(adminId);
        if (!isOwner) throw new IllegalStateException("Только владелец лагеря может исключать вожатых");

        CampMember member = campMemberRepository
                .findByCampIdAndUserIdAndActiveTrue(campId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Вожатый не найден в лагере"));

        if (member.getRole() != CampRole.COUNSELOR) {
            throw new IllegalStateException("Нельзя исключить не-вожатого");
        }

        // Деактивируем сам CampMember
        member.setActive(false);
        member.setRemovedAt(OffsetDateTime.now());
        campMemberRepository.save(member);

        // Удаляем все привязки к сменам
        campMemberSessionRepository.deleteByCampMemberId(member.getId());

        // Снимаем со всех отрядов лагеря
        counselorAssignmentRepository.findByUserIdAndActiveTrue(userId).stream()
                .filter(a -> a.getDetachment().getSession().getCamp().getId().equals(campId))
                .forEach(a -> {
                    a.setActive(false);
                    a.setRemovedAt(OffsetDateTime.now());
                    counselorAssignmentRepository.save(a);
                    log.info("Auto-removed counselor {} from detachment {} (camp removal)",
                            userId, a.getDetachment().getId());
                });

        auditEventService.log(
                campId,
                "CAMP_MEMBER_REMOVED",
                "Вожатый исключён из лагеря «" + camp.getName() + "»",
                "CAMP_MEMBER",
                member.getId(),
                adminId,
                Map.of("removedUserId", userId.toString())
        );

        log.info("Counselor {} fully removed from camp {}", userId, campId);
    }

    // =========================================================================
    // Прочие методы
    // =========================================================================

    @Override
    public void leaveCamp(UUID userId) {
        log.info("Counselor {} leaving all camps", userId);
        List<CampMember> memberships = campMemberRepository.findByUserIdAndActiveTrue(userId);
        for (CampMember member : memberships) {
            if (member.getRole() == CampRole.COUNSELOR) {
                member.setActive(false);
                member.setRemovedAt(OffsetDateTime.now());
                campMemberRepository.save(member);
                campMemberSessionRepository.deleteByCampMemberId(member.getId());
                log.info("Counselor {} left camp {}", userId, member.getCamp().getId());
                return;
            }
        }
        throw new ResourceNotFoundException("Активное членство в лагере не найдено");
    }

    @Override
    @Transactional(readOnly = true)
    public CampMemberResponseDto getMyCamp(UUID userId) {
        return campMemberRepository.findByUserIdAndActiveTrue(userId).stream()
                .filter(m -> m.getRole() == CampRole.COUNSELOR)
                .findFirst()
                .map(this::mapToDto)
                .orElse(null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampMemberResponseDto> getCampCounselors(UUID campId) {
        return campMemberRepository.findByCampIdAndActiveTrue(campId).stream()
                .filter(m -> m.getRole() == CampRole.COUNSELOR)
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isCounselorInAnyCamp(UUID userId) {
        return campMemberRepository.findByUserIdAndActiveTrue(userId).stream()
                .anyMatch(m -> m.getRole() == CampRole.COUNSELOR);
    }

    // =========================================================================
    // Маппинг
    // =========================================================================

    private CampMemberResponseDto mapToDto(CampMember member) {
        List<UUID> sessionIds = member.getSessions().stream()
                .map(cms -> cms.getSession().getId())
                .collect(Collectors.toList());

        return CampMemberResponseDto.builder()
                .id(member.getId())
                .campId(member.getCamp().getId())
                .campName(member.getCamp().getName())
                .userId(member.getUserId())
                .role(member.getRole())
                .active(member.isActive())
                .sessionIds(sessionIds)
                .build();
    }
}