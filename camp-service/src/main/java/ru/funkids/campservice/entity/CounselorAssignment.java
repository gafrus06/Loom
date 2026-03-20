package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Назначение вожатого в конкретный отряд.
 *
 * roleInDetachment:
 *   LEAD      — создатель отряда, главный вожатый
 *   ASSISTANT — помощник, добавленный LEAD-ом или ADMIN-ом
 *
 * Правила исключения (enforced в DetachmentSecurityService):
 *   - ADMIN лагеря может исключить кого угодно
 *   - LEAD может исключить только ASSISTANT-а
 *   - ASSISTANT не может исключать никого
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "counselor_assignments",
        indexes = {
                @Index(name = "ix_counselor_detachment", columnList = "detachment_id"),
                @Index(name = "ix_counselor_user",       columnList = "user_id"),
                @Index(name = "ix_counselor_active",     columnList = "detachment_id,user_id,active")
        })
public class CounselorAssignment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "detachment_id", nullable = false)
    private Detachment detachment;

    /** UUID пользователя из user-service */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    /** Роль вожатого в этом отряде: LEAD или ASSISTANT */
    @Enumerated(EnumType.STRING)
    @Column(name = "role_in_detachment", nullable = false, length = 20)
    private DetachmentRole roleInDetachment;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime assignedAt;

    /** Заполняется при деактивации */
    private OffsetDateTime removedAt;
}