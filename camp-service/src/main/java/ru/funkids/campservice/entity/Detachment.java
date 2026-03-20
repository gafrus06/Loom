package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "detachments",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_detachments_session_name",
                columnNames = {"session_id", "name"}
        ),
        indexes = {
                @Index(name = "ix_detachments_session_id", columnList = "session_id"),
                @Index(name = "ix_detachments_stage", columnList = "stage")
        })
public class Detachment {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;
    @Column(name = "creator_id", nullable = false)
    private UUID creatorId; // кто создал отряд
    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String ageGroup; // e.g. "7-9", "10-12"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DetachmentStage stage = DetachmentStage.NEW;

    @CreationTimestamp
    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "detachment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DetachmentMembership> memberships = new ArrayList<>();

    @OneToMany(mappedBy = "detachment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CounselorAssignment> counselors = new ArrayList<>();
}