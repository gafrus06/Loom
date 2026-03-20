package ru.fun.userservice.entity;

import jakarta.persistence.*;
import lombok.*;


// ParentProfile.java
@Entity
@Table(name = "parents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(of = "id") @ToString(exclude = "userProfile")
public class ParentProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserProfile userProfile;

    @Column(length = 100)
    private String emergencyContactName;


    @Column(length = 20)
    private String emergencyContactPhone;

    @Column(length = 255)
    private String address;

    @Column(columnDefinition = "text")
    private String notes;
}

