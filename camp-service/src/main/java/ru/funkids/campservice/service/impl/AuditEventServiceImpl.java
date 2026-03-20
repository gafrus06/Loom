package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.AuditEventResponseDto;
import ru.funkids.campservice.entity.AuditEvent;
import ru.funkids.campservice.repository.AuditEventRepository;
import ru.funkids.campservice.service.AuditEventService;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AuditEventServiceImpl implements AuditEventService {

    private final AuditEventRepository auditEventRepository;

    // -------------------------------------------------------------------------
    // Запись события
    // -------------------------------------------------------------------------

    @Override
    public void log(UUID campId,
                    String action,
                    String description,
                    String entityType,
                    UUID entityId,
                    UUID actorUserId,
                    Map<String, Object> details) {

        log.info("Audit: campId={} action={} entity={}/{} actor={} | {}",
                campId, action, entityType, entityId, actorUserId, description);

        AuditEvent event = AuditEvent.builder()
                .campId(campId)
                .actorUserId(actorUserId)
                .action(action)
                .description(description)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .build();

        auditEventRepository.save(event);
    }

    // -------------------------------------------------------------------------
    // Чтение
    // -------------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public List<AuditEventResponseDto> recentByEntity(String entityType, UUID entityId, int limit) {
        return auditEventRepository
                .findByEntityTypeAndEntityIdOrderByTimestampDesc(
                        entityType, entityId, PageRequest.of(0, limit))
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditEventResponseDto> recentByActor(UUID actorUserId, int limit) {
        return auditEventRepository
                .findByActorUserIdOrderByTimestampDesc(actorUserId, PageRequest.of(0, limit))
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditEventResponseDto> recentByCamp(UUID campId, int limit) {
        return auditEventRepository
                .findByCampIdOrderByTimestampDesc(campId, PageRequest.of(0, limit))
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditEventResponseDto> recentByCampAndAction(UUID campId, String action, int limit) {
        return auditEventRepository
                .findByCampIdAndActionOrderByTimestampDesc(campId, action, PageRequest.of(0, limit))
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // -------------------------------------------------------------------------
    // Маппинг
    // -------------------------------------------------------------------------

    private AuditEventResponseDto mapToDto(AuditEvent event) {
        return AuditEventResponseDto.builder()
                .id(event.getId())
                .campId(event.getCampId())
                .actorUserId(event.getActorUserId())
                .action(event.getAction())
                .description(event.getDescription())
                .entityType(event.getEntityType())
                .entityId(event.getEntityId())
                .timestamp(event.getTimestamp())
                .details(event.getDetails())
                .build();
    }
}