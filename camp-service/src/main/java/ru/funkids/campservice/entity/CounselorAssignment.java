package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "counselor_assignments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_counselor_assignment_detachment_user_active",
                        columnNames = {"detachment_id", "user_id", "active"}
                )
        },
        indexes = {
                @Index(name = "ix_counselor_detachment", columnList = "detachment_id"),
                @Index(name = "ix_counselor_user", columnList = "user_id"),
                @Index(name = "ix_counselor_active", columnList = "detachment_id,user_id,active")
        })
public class CounselorAssignment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "detachment_id", nullable = false)
    private Detachment detachment;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "role_in_detachment", nullable = false, length = 20)
    private DetachmentRole roleInDetachment;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime assignedAt;

    private OffsetDateTime removedAt;

    @Version
    private Long version;
}
