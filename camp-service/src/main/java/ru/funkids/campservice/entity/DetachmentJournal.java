package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "detachment_journals",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_detachment_journals_detachment_date",
                columnNames = {"detachment_id", "journal_date"}
        ),
        indexes = {
                @Index(name = "ix_detachment_journals_detachment", columnList = "detachment_id"),
                @Index(name = "ix_detachment_journals_date", columnList = "journal_date")
        })
public class DetachmentJournal {

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

    @Column(name = "journal_date", nullable = false)
    private LocalDate journalDate;

    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId;

    @Column(name = "updated_by_user_id")
    private UUID updatedByUserId;

    @Lob
    private String participationInfo;

    @Lob
    private String adaptationInfo;

    @Lob
    private String conflictInfo;

    @Lob
    private String successInfo;

    @Column(length = 100)
    private String activityLevel;

    @Lob
    private String notes;

    @Lob
    @Column(name = "visible_for_parents_version")
    private String visibleForParentsVersion;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private OffsetDateTime updatedAt;
}
