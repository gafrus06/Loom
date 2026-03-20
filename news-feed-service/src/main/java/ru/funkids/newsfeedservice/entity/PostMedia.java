package ru.funkids.newsfeedservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "post_media",
        indexes = @Index(name = "idx_post_media_post_id", columnList = "post_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @Column(name = "media_type", length = 20)
    @Builder.Default
    private String mediaType = "IMAGE";

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Column(name = "file_id")
    private UUID fileId;

    // Длительность видео в секундах (null для изображений)
    @Column(name = "duration_sec")
    private Long durationSec;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}