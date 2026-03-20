// src/main/java/ru/fun/userservice/entity/CounselorProfile.java
package ru.fun.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "counselors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = "userProfile")
public class CounselorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String specialization;
    private Long experienceYears;

    @Column(length = 2000)
    private String bio;

    // Comma-separated UUIDs of uploaded education document files
    @Column(length = 2000)
    private String educationDocumentIds;

    private String telegram;

    @Column(length = 255)
    private String shiftPreference;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserProfile userProfile;
}