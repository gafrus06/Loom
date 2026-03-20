package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Код приглашения для родителей.
 *
 * Инвайт-код теперь выдаётся на уровне смены (sessionId обязателен).
 * Родитель вводит код → привязывается к лагерю + конкретной смене
 * через запись CampParent(campId, sessionId, parentUserId).
 *
 * Администратор генерирует отдельный код для каждой смены
 * (или один код на смену и раздаёт его на родительском собрании).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "camp_invite_codes", indexes = {
        @Index(name = "ix_invite_code", columnList = "code", unique = true),
        @Index(name = "ix_invite_camp",    columnList = "camp_id"),
        @Index(name = "ix_invite_session", columnList = "session_id")
})
public class CampInviteCode {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @Column(name = "camp_id", nullable = false)
    private UUID campId;

    /**
     * Смена, к которой привязывает этот код.
     * Родитель, использовавший этот код, получит запись
     * CampParent(campId, sessionId, parentUserId).
     */
    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    /** Короткий человекочитаемый код, например CAMP-4X9K */
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_by", nullable = false)
    private UUID createdBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}