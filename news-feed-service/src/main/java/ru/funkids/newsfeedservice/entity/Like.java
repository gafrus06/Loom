package ru.funkids.newsfeedservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "post_likes",
        indexes = {
                @Index(name = "idx_likes_post_id", columnList = "post_id"),
                @Index(name = "idx_likes_user_id", columnList = "user_id")
        },
        uniqueConstraints = @UniqueConstraint(
                name = "uk_post_user_like",
                columnNames = {"post_id", "user_id"}
        ))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Like {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "user_role", length = 20, nullable = false)
    private String userRole;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}