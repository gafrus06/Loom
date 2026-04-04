package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Привязка сотрудника (CampMember) к конкретной смене.
 *
 * В новой модели именно здесь хранится:
 * - подроль в рамках смены;
 * - статус назначения;
 * - кто назначил;
 * - когда сотрудник ответил;
 * - когда связь была автозавершена после окончания смены.
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
                @Index(name = "ix_cms_member", columnList = "camp_member_id"),
                @Index(name = "ix_cms_session", columnList = "session_id"),
                @Index(name = "ix_cms_status", columnList = "assignment_status"),
                @Index(name = "ix_cms_sub_role", columnList = "sub_role")
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

    @Enumerated(EnumType.STRING)
    @Column(name = "sub_role", nullable = false, length = 40)
    @Builder.Default
    private StaffSubRole subRole = StaffSubRole.COUNSELOR;

    @Enumerated(EnumType.STRING)
    @Column(name = "assignment_status", nullable = false, length = 30)
    @Builder.Default
    private AssignmentStatus assignmentStatus = AssignmentStatus.PENDING;

    @Column(name = "assigned_by_user_id")
    private UUID assignedByUserId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime assignedAt;

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    @Column(name = "auto_detached_at")
    private OffsetDateTime autoDetachedAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Version
    private Long version;
}
