package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Привязка вожатого (CampMember) к конкретной смене (Session).
 *
 * Логика:
 *   - ADMIN (CampRole.OWNER) не получает записей в эту таблицу —
 *     его доступ ко всем сменам проверяется по роли напрямую.
 *   - Вожатый (CampRole.COUNSELOR) получает одну запись на каждую смену,
 *     в которую его назначил ADMIN.
 *   - Один вожатый может быть назначен на несколько смен одного лагеря.
 *
 * Пример: вожатый назначен в лагерь "Солнышко" на смены 1 и 3 →
 *   camp_members: (campId=X, userId=Y, role=COUNSELOR)
 *   camp_member_sessions: (campMemberId=M, sessionId=S1), (campMemberId=M, sessionId=S3)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "camp_member_sessions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_camp_member_sessions_member_session",
                columnNames = {"camp_member_id", "session_id"}
        ),
        indexes = {
                @Index(name = "ix_cms_member",  columnList = "camp_member_id"),
                @Index(name = "ix_cms_session", columnList = "session_id")
        })
public class CampMemberSession {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "camp_member_id", nullable = false)
    private CampMember campMember;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime assignedAt;
}