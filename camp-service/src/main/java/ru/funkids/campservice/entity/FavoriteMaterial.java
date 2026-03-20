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
@Table(name = "favorite_materials",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_favorites_detachment_material",
                columnNames = {"detachment_id", "material_id", "material_type"}
        ),
        indexes = {
                @Index(name = "ix_favorites_detachment", columnList = "detachment_id")
        })
public class FavoriteMaterial {

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

    @CreationTimestamp
    @Column(name = "added_at", nullable = false)
    private OffsetDateTime addedAt;

    @Column(name = "added_by")
    private UUID addedBy; // кто добавил в избранное
}