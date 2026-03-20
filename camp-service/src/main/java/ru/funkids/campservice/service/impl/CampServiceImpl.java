package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.*;
import ru.funkids.campservice.service.AuditEventService;
import ru.funkids.campservice.service.CampService;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CampServiceImpl implements CampService {

    private final CampRepository campRepository;
    private final CampParentRepository campParentRepository;
    private final SessionRepository sessionRepository;
    private final AuditEventService auditEventService;

    // =========================================================================
    // CRUD лагеря
    // =========================================================================

    @Override
    public CampResponseDto create(CampCreateDto dto, UUID ownerId) {
        log.info("Creating camp: {} for owner: {}", dto.getName(), ownerId);

        Camp camp = Camp.builder()
                .name(dto.getName())
                .location(dto.getLocation())
                .description(dto.getDescription())
                .ownerId(ownerId)
                .build();

        // Автоматически создаём запись CampMember(OWNER) для создателя
        CampMember ownerMember = CampMember.builder()
                .camp(camp)
                .userId(ownerId)
                .role(CampRole.OWNER)
                .active(true)
                .build();
        camp.getMembers().add(ownerMember);

        Camp saved = campRepository.save(camp);
        log.info("Camp created: {}", saved.getId());
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CampResponseDto get(UUID id) {
        Camp camp = campRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Лагерь не найден: " + id));
        return mapToDto(camp);
    }

    @Override
    public CampResponseDto update(UUID id, CampUpdateDto dto) {
        Camp camp = campRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Лагерь не найден: " + id));

        if (dto.getName()        != null) camp.setName(dto.getName());
        if (dto.getLocation()    != null) camp.setLocation(dto.getLocation());
        if (dto.getDescription() != null) camp.setDescription(dto.getDescription());

        return mapToDto(campRepository.save(camp));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampResponseDto> listByOwner(UUID ownerId) {
        return campRepository.findByOwnerId(ownerId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampResponseDto> listAll() {
        return campRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public void delete(UUID id) {
        campRepository.deleteById(id);
    }

    // =========================================================================
    // Доступные лагеря для текущего пользователя
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public List<CampWithRoleDto> listMyAccessibleCamps(UUID userId, boolean isParent) {
        log.info("Accessible camps for user: {}, isParent: {}", userId, isParent);
        return isParent
                ? listParentAccessibleCamps(userId)
                : listStaffAccessibleCamps(userId);
    }

    // -------------------------------------------------------------------------
    // ADMIN / COUNSELOR — существующая логика без изменений
    // -------------------------------------------------------------------------

    private List<CampWithRoleDto> listStaffAccessibleCamps(UUID userId) {
        Map<UUID, CampWithRoleDto> result = new LinkedHashMap<>();

        // 1. Лагеря где пользователь — OWNER
        campRepository.findOwnedByUser(userId).forEach(camp -> {
            result.put(camp.getId(), CampWithRoleDto.builder()
                    .id(camp.getId())
                    .name(camp.getName())
                    .location(camp.getLocation())
                    .description(camp.getDescription())
                    .ownerId(camp.getOwnerId())
                    .createdAt(camp.getCreatedAt())
                    .updatedAt(camp.getUpdatedAt())
                    .accessType("OWNER")
                    .owner(true)
                    .assignedCounselor(false)
                    .build());
        });

        // 2. Лагеря где пользователь — COUNSELOR
        campRepository.findAssignedToUser(userId).forEach(camp -> {
            CampWithRoleDto existing = result.get(camp.getId());
            if (existing != null) {
                existing.setAccessType("OWNER_AND_COUNSELOR");
                existing.setAssignedCounselor(true);
            } else {
                result.put(camp.getId(), CampWithRoleDto.builder()
                        .id(camp.getId())
                        .name(camp.getName())
                        .location(camp.getLocation())
                        .description(camp.getDescription())
                        .ownerId(camp.getOwnerId())
                        .createdAt(camp.getCreatedAt())
                        .updatedAt(camp.getUpdatedAt())
                        .accessType("COUNSELOR")
                        .owner(false)
                        .assignedCounselor(true)
                        .build());
            }
        });

        List<CampWithRoleDto> list = new ArrayList<>(result.values());
        // Сначала свои (OWNER), потом назначенные (COUNSELOR)
        list.sort((a, b) -> {
            if (a.isOwner() != b.isOwner()) return a.isOwner() ? -1 : 1;
            return a.getName().compareTo(b.getName());
        });
        return list;
    }

    // -------------------------------------------------------------------------
    // PARENT — прямой запрос через camp_parents (быстро и надёжно)
    //
    // Старая реализация: ParentLink → DetachmentMembership → Detachment → Session → Camp
    // Проблема: 4 джойна, ленивые загрузки, N+1 запросов.
    //
    // Новая реализация: camp_parents содержит явную привязку (campId, sessionId, parentUserId).
    // Один запрос — полный список доступных смен родителя.
    // Если у родителя двое детей в разных сменах/лагерях — будет несколько записей CampParent,
    // и каждая смена/лагерь будет отображена отдельно.
    // -------------------------------------------------------------------------

    private List<CampWithRoleDto> listParentAccessibleCamps(UUID parentUserId) {
        log.info("Finding accessible camps for parent: {}", parentUserId);

        // Все привязки родителя (каждая = конкретная смена конкретного лагеря)
        List<CampParent> parentLinks = campParentRepository.findAllSessionsByParentUserId(parentUserId);

        if (parentLinks.isEmpty()) {
            log.info("Parent {} has no camp links", parentUserId);
            return Collections.emptyList();
        }

        // Собираем уникальные campId
        Set<UUID> campIds = parentLinks.stream()
                .map(CampParent::getCampId)
                .collect(Collectors.toSet());

        // Загружаем лагеря одним запросом
        Map<UUID, Camp> campsById = campRepository.findAllById(campIds).stream()
                .collect(Collectors.toMap(Camp::getId, c -> c));

        // Строим DTO — один DTO на лагерь (доступные смены указываем в sessionIds)
        // Если один родитель в двух сменах одного лагеря — один DTO с двумя sessionIds
        Map<UUID, CampWithRoleDto> result = new LinkedHashMap<>();

        for (CampParent link : parentLinks) {
            Camp camp = campsById.get(link.getCampId());
            if (camp == null) continue;

            result.computeIfAbsent(camp.getId(), id -> CampWithRoleDto.builder()
                            .id(camp.getId())
                            .name(camp.getName())
                            .location(camp.getLocation())
                            .description(camp.getDescription())
                            .ownerId(camp.getOwnerId())
                            .createdAt(camp.getCreatedAt())
                            .updatedAt(camp.getUpdatedAt())
                            .accessType("PARENT")
                            .owner(false)
                            .assignedCounselor(false)
                            .sessionIds(new ArrayList<>())
                            .build())
                    .getSessionIds()
                    .add(link.getSessionId());
        }

        log.info("Parent {} has access to {} camps", parentUserId, result.size());
        return new ArrayList<>(result.values());
    }

    // =========================================================================
    // Маппинг
    // =========================================================================

    private CampResponseDto mapToDto(Camp camp) {
        return CampResponseDto.builder()
                .id(camp.getId())
                .name(camp.getName())
                .location(camp.getLocation())
                .description(camp.getDescription())
                .ownerId(camp.getOwnerId())
                .createdAt(camp.getCreatedAt())
                .updatedAt(camp.getUpdatedAt())
                .build();
    }
}