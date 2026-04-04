package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Заявка родителя на ребёнка.
 * Родитель привязывается к лагерю через код, затем заполняет эту заявку.
 * Вожатый видит список заявок и подтверждает нужных детей в свой отряд.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "child_applications", indexes = {
        @Index(name = "ix_child_app_camp",   columnList = "camp_id"),
        @Index(name = "ix_child_app_parent", columnList = "parent_user_id"),
        @Index(name = "ix_child_app_status", columnList = "status")
})
public class ChildApplication {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    /** Лагерь, к которому привязан родитель через код */
    @Column(name = "camp_id", nullable = false)
    private UUID campId;

    /** UUID родителя из user-service */
    @Column(name = "parent_user_id", nullable = false)
    private UUID parentUserId;

    /** Данные ребёнка, заполненные родителем */
    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(length = 100)
    private String homeCity;

    @Column(length = 1000)
    private String medicalNotes;

    @Column(length = 500)
    private String allergies;

    @Column(length = 500)
    private String specialNeeds;

    @Column(length = 1000)
    private String behavioralNotes;

    /** Кем приходится родитель ребёнку */
    @Column(length = 50)
    private String relation; // Мама / Папа / Опекун

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.PENDING;

    /** Заполняется когда вожатый подтверждает — ID созданного ребёнка */
    @Column(name = "child_id")
    private UUID childId;

    /** Вожатый, который подтвердил */
    @Column(name = "confirmed_by")
    private UUID confirmedBy;

    @CreationTimestamp
    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @Version
    private Long version;
}
