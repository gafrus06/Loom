package ru.fun.authservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.Instant;
import java.util.UUID;

/**
 * Связь пользователь ↔ роль с метаданными назначения.
 *
 * Хранит:
 * - кто назначил роль (assignedByUserId) — нужно для проверки права на удаление
 * - когда назначил (assignedAt)
 * - активна ли роль (active) — при снятии роли не удаляем запись, а деактивируем
 *
 * Бизнес-правило: удалить роль может только тот, кто её назначил,
 * либо пользователь с ролью ROLE_SUPER_ADMIN.
 */
@Entity
@Table(
        name = "user_roles",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_user_role_active",
                columnNames = {"user_id", "role", "active"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString
public class UserRole {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    /**
     * Пользователь, которому выдана роль.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * Тип роли — строка из AppRole enum (например "ROLE_ADMIN").
     * Не FK на таблицу roles — роли фиксированы в коде.
     */
    @Column(name = "role", nullable = false, length = 50)
    private String role;

    /**
     * UUID пользователя, который назначил эту роль.
     * NULL только для системных назначений (например, ROLE_USER при регистрации).
     */
    @Column(name = "assigned_by_user_id")
    private UUID assignedByUserId;

    /**
     * Когда была назначена роль.
     */
    @Column(name = "assigned_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant assignedAt = Instant.now();

    /**
     * Активна ли роль.
     * false = роль была отозвана, запись сохраняется для аудита.
     */
    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Когда роль была отозвана (для аудита).
     */
    @Column(name = "revoked_at")
    private Instant revokedAt;

    /**
     * Кто отозвал роль (для аудита).
     */
    @Column(name = "revoked_by_user_id")
    private UUID revokedByUserId;
}