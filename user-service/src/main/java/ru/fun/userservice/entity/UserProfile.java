package ru.fun.userservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import ru.fun.userservice.service.PhoneE164Converter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString
public class UserProfile {

    @Id
    private UUID id;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Column(length = 100)
    private String firstName;

    @Column(length = 100)
    private String secondName;

    @Column(length = 100)
    private String thirdName;

    @Convert(converter = PhoneE164Converter.class)
    @Column(length = 16)
    private String phone;

    @Builder.Default
    @Column(nullable = false)
    private Boolean phoneVerified = false;

    private UUID avatarFileId;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}