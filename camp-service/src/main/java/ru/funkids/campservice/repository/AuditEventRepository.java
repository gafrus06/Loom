package ru.funkids.campservice.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.AuditEvent;

import java.util.List;
import java.util.UUID;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    /** По типу и ID сущности (drill-down на конкретный объект) */
    List<AuditEvent> findByEntityTypeAndEntityIdOrderByTimestampDesc(
            String entityType, UUID entityId, Pageable pageable);

    /** По актору (история действий конкретного пользователя) */
    List<AuditEvent> findByActorUserIdOrderByTimestampDesc(
            UUID actorUserId, Pageable pageable);

    /** По лагерю — основной метод для ленты событий лагеря */
    List<AuditEvent> findByCampIdOrderByTimestampDesc(
            UUID campId, Pageable pageable);

    /** По лагерю + код действия (фильтрация по типу события) */
    List<AuditEvent> findByCampIdAndActionOrderByTimestampDesc(
            UUID campId, String action, Pageable pageable);
}