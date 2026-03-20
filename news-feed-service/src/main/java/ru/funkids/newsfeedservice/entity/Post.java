package ru.funkids.newsfeedservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "posts",
        indexes = {
                @Index(name = "idx_posts_camp_id",       columnList = "camp_id"),
                @Index(name = "idx_posts_author_id",     columnList = "author_id"),
                @Index(name = "idx_posts_pinned_order",  columnList = "is_pinned, pinned_order DESC, created_at DESC"),
                @Index(name = "idx_posts_detachment_id", columnList = "detachment_id"),
                @Index(name = "idx_posts_created_at",    columnList = "created_at DESC")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "author_id", nullable = false)
    private UUID authorId;

    @Column(name = "camp_id", nullable = false)
    private UUID campId;

    @Column(name = "detachment_id")
    private UUID detachmentId;

    @Column(length = 200)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    // Называем поле "pinned", а не "isPinned" — иначе Lombok генерирует геттер isPinned(),
    // а Jackson ищет getIsPinned() и не находит его → поле не сериализуется.
    // С именем "pinned" Lombok генерирует isPinned() (boolean-геттер) и setPinned(),
    // Jackson находит isPinned() и корректно пишет "isPinned": true/false в JSON.
    @Column(name = "is_pinned", nullable = false)
    @Builder.Default
    private boolean pinned = false;

    @Column(name = "pinned_order")
    private Integer pinnedOrder;

    // BatchSize решает N+1 при загрузке списка постов:
    // вместо N запросов SELECT media WHERE post_id=? Hibernate делает
    // один запрос SELECT media WHERE post_id IN (?, ?, ..., ?) пачками по 30
    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 30)
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<PostMedia> media = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public void addMedia(PostMedia mediaItem) {
        media.add(mediaItem);
        mediaItem.setPost(this);
    }
}