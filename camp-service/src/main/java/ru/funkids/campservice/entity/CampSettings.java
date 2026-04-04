package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "camp_settings",
        uniqueConstraints = @UniqueConstraint(name = "uk_camp_settings_camp", columnNames = "camp_id"))
public class CampSettings {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "camp_id", nullable = false)
    private Camp camp;

    @Enumerated(EnumType.STRING)
    @Column(name = "posting_mode", nullable = false, length = 40)
    @Builder.Default
    private PostingMode postingMode = PostingMode.MODERATED;

    @Column(name = "calendar_enabled", nullable = false)
    @Builder.Default
    private boolean calendarEnabled = false;

    @Column(name = "calendar_visible_for_parents", nullable = false)
    @Builder.Default
    private boolean calendarVisibleForParents = false;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private OffsetDateTime updatedAt;
}
