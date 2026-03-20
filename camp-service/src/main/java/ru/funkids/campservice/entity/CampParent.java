package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Привязка родителя к конкретному лагерю И конкретной смене.
 *
 * Родитель может быть привязан к нескольким сменам (например, один ребёнок
 * в смене 1, другой — в смене 2 того же лагеря). В этом случае создаются
 * две отдельные записи.
 *
 * Привязка происходит через инвайт-код, который содержит campId + sessionId.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "camp_parents",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_camp_parents_camp_session_user",
                columnNames = {"camp_id", "session_id", "parent_user_id"}
        ),
        indexes = {
                @Index(name = "ix_camp_parents_camp",    columnList = "camp_id"),
                @Index(name = "ix_camp_parents_session", columnList = "session_id"),
                @Index(name = "ix_camp_parents_parent",  columnList = "parent_user_id")
        })
public class CampParent {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    /** Лагерь */
    @Column(name = "camp_id", nullable = false)
    private UUID campId;

    /**
     * Конкретная смена, к которой привязан родитель.
     * Инвайт-код теперь выдаётся на уровне смены, а не лагеря в целом.
     */
    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    /** UUID родителя из user-service */
    @Column(name = "parent_user_id", nullable = false)
    private UUID parentUserId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime joinedAt;
}