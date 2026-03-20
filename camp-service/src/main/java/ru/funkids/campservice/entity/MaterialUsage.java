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
@Table(name = "material_usages",
        indexes = {
                @Index(name = "ix_usages_detachment", columnList = "detachment_id"),
                @Index(name = "ix_usages_material", columnList = "material_id"),
                @Index(name = "ix_usages_used_at", columnList = "used_at")
        })
public class MaterialUsage {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @Column(name = "detachment_id", nullable = false)
    private UUID detachmentId;

    @Column(name = "material_id", nullable = false)
    private UUID materialId;

    @Column(name = "material_type", nullable = false, length = 20)
    private String materialType; // GAME, CAMPFIRE, EXERCISE

    @Column(name = "used_at", nullable = false)
    private OffsetDateTime usedAt;

    @Column(name = "stage", nullable = false, length = 20)
    private String stage; // на каком этапе использовали

    @Column(name = "used_by")
    private UUID usedBy; // кто отметил использование

    @Column(name = "notes", length = 500)
    private String notes; // заметки по использованию
}