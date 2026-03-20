package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "children", indexes = {
        @Index(name = "ix_children_created_by", columnList = "created_by_user_id")
})
public class Child {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(nullable = false, length = 100)
    private String lastName;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender; // MALE, FEMALE

    @Column(length = 100)
    private String homeCity;

    // Медицинские данные (заполняются родителем)
    @Column(length = 1000)
    private String medicalNotes; // общие медицинские заметки

    @Column(length = 500)
    private String allergies; // аллергии

    @Column(length = 500)
    private String specialNeeds; // особые потребности

    @Column(length = 1000)
    private String behavioralNotes; // поведенческие особенности

    private UUID avatarFileId;

    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId; // вожатый, создавший карточку

    @Column(nullable = false)
    @Builder.Default
    private boolean parentVerified = false; // родитель подтвердил данные

    @CreationTimestamp
    @Column(nullable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @OneToMany(mappedBy = "child", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<ParentLink> parentLinks = new ArrayList<>();

    @OneToMany(mappedBy = "child", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<DetachmentMembership> memberships = new ArrayList<>();

    @Transient
    public int getAge() {
        return Period.between(birthDate, LocalDate.now()).getYears();
    }
}