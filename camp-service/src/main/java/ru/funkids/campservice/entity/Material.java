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
@Table(name = "materials",
        indexes = {
                @Index(name = "ix_materials_type", columnList = "type"),
                @Index(name = "ix_materials_stage", columnList = "stage"),
                @Index(name = "ix_materials_age_group", columnList = "age_group")
        })
public class Material {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 50)
    private String type; // GAME, CAMPFIRE, EXERCISE, PHYSIOLOGICAL

    @Column(nullable = false, length = 20)
    private String stage; // NEW, ORGANIZATIONAL, BUSINESS, CONSTRUCTIVE, FINAL, COMPLETED

    @Column(name = "age_group", nullable = false, length = 20)
    private String ageGroup; // 5-7, 8-10, 11-13, 14-17, ALL

    @Column(length = 1000)
    private String description;

    @Column(name = "duration", length = 50)
    private String duration; // например "15-20 мин"

    @Column(name = "players", length = 50)
    private String players; // например "10-30"

    @Column(name = "materials_needed", length = 500)
    private String materials; // необходимые материалы

    @Column(length = 500)
    private String purpose; // цель игры/упражнения

    @Column(name = "form", length = 100)
    private String form; // для огоньков: "Круг", "Круг со свечами" и т.д.

    @Column(name = "atmosphere", length = 100)
    private String atmosphere; // для огоньков

    @Column(name = "difficulty", length = 20)
    private String difficulty; // для упражнений: Легкая, Средняя, Сложная

    @Column(name = "effect", length = 500)
    private String effect; // эффект от упражнения

    @Column(name = "recommendations", length = 1000)
    private String recommendations; // для физиологии и общие рекомендации

    @Column(name = "content", columnDefinition = "TEXT")
    private String content; // подробное описание

    @CreationTimestamp
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

}