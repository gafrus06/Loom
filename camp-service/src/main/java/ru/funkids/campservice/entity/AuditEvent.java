package ru.funkids.campservice.entity;

import io.hypersistence.utils.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Type;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Событие аудита.
 *
 * Ключевые изменения относительно исходной версии:
 *
 *   campId      — привязка события к лагерю, позволяет фильтровать
 *                 лог для конкретного лагеря в аналитике.
 *
 *   description — человекочитаемое краткое описание без UUID:
 *                 "Вожатый Иван Петров назначен на смену «Смена 1»"
 *                 "Отряд «Орлята» перешёл на этап: Деловой"
 *                 "Создана смена «Лето 2025» (01.06 – 21.06)"
 *                 "Вожатый Мария Сидорова исключена из отряда «Орлята»"
 *                 "Заявка на ребёнка Алексей Комаров подтверждена"
 *
 * Стандартные значения action:
 *   COUNSELOR_ASSIGNED, COUNSELOR_REMOVED
 *   SESSION_CREATED
 *   DETACHMENT_CREATED, DETACHMENT_STAGE_CHANGED
 *   CHILD_APPLICATION_CONFIRMED, CHILD_APPLICATION_REJECTED
 *   CHILD_ADDED_TO_DETACHMENT, CHILD_REMOVED_FROM_DETACHMENT
 *   CAMP_MEMBER_REMOVED
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "audit_events", indexes = {
        @Index(name = "ix_audit_camp",   columnList = "camp_id"),
        @Index(name = "ix_audit_actor",  columnList = "actor_user_id"),
        @Index(name = "ix_audit_entity", columnList = "entity_type,entity_id")
})
public class AuditEvent {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    /**
     * Лагерь, в котором произошло событие.
     * Основной ключ для фильтрации в аналитике.
     */
    @Column(name = "camp_id")
    private UUID campId;

    /** UUID пользователя, совершившего действие */
    @Column(name = "actor_user_id", nullable = false)
    private UUID actorUserId;

    /**
     * Машиночитаемый код действия (для программной обработки).
     * Примеры: DETACHMENT_STAGE_CHANGED, COUNSELOR_ASSIGNED
     */
    @Column(nullable = false, length = 100)
    private String action;

    /**
     * Человекочитаемое описание события без UUID.
     * Используется непосредственно в UI аналитики.
     * Заполняется вызывающим сервисом, который знает имена/названия.
     *
     * Примеры:
     *   "Вожатый Иван Петров назначен на смену «Смена 1» лагеря «Солнышко»"
     *   "Отряд «Орлята» перешёл на этап: Деловой"
     *   "Создана смена «Лето 2025» (01.06.2025 – 21.06.2025)"
     *   "Вожатый Мария Сидорова исключена из отряда «Орлята»"
     *   "Заявка на ребёнка Алексей Комаров подтверждена вожатым Иван Петров"
     */
    @Column(name = "description", length = 500)
    private String description;

    /** Тип затронутой сущности: DETACHMENT, SESSION, CHILD, CAMP_MEMBER и т.д. */
    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    /** UUID затронутой сущности (для детального drill-down при необходимости) */
    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime timestamp;

    /**
     * Дополнительные данные в JSON (для технического лога).
     * Может содержать старые/новые значения полей и прочий контекст.
     */
    @Column(columnDefinition = "jsonb")
    @Type(JsonType.class)
    private Map<String, Object> details;
}