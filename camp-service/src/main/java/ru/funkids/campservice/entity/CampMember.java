package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Членство пользователя в лагере.
 *
 * OWNER     — администратор, создавший лагерь. Имеет полный доступ ко всем сменам.
 *             Записей в camp_member_sessions не создаётся.
 *
 * COUNSELOR — вожатый. Имеет доступ только к тем сменам, которые указаны
 *             в связанных записях CampMemberSession.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "camp_members",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_camp_members_camp_user",
                columnNames = {"camp_id", "user_id"}
        ),
        indexes = {
                @Index(name = "ix_camp_members_camp", columnList = "camp_id"),
                @Index(name = "ix_camp_members_user", columnList = "user_id")
        })
public class CampMember {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "camp_id", nullable = false)
    private Camp camp;

    /** UUID пользователя из user-service */
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CampRole role;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime assignedAt;

    /** Заполняется при деактивации */
    private OffsetDateTime removedAt;

    /**
     * Привязки к сменам (только для COUNSELOR).
     * Для OWNER список всегда пустой — доступ по роли.
     */
    @OneToMany(mappedBy = "campMember", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CampMemberSession> sessions = new ArrayList<>();
}