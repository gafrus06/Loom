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
@Table(name = "detachment_memberships",
        indexes = {
                @Index(name = "ix_memb_detachment", columnList = "detachment_id"),
                @Index(name = "ix_memb_child", columnList = "child_id")
        })
public class DetachmentMembership {

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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "child_id", nullable = false)
    private Child child;

    @CreationTimestamp
    @Column(nullable = false)
    private OffsetDateTime joinedAt;

    private OffsetDateTime leftAt;

    @Lob
    private String notes;

    @Transient
    public boolean isActive() {
        return leftAt == null;
    }
}