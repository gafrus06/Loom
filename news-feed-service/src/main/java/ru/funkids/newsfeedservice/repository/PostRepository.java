package ru.funkids.newsfeedservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.funkids.newsfeedservice.entity.Post;
import ru.funkids.newsfeedservice.entity.PostModerationStatus;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {

    @EntityGraph(attributePaths = "media")
    Optional<Post> findWithMediaById(UUID id);

    /**
     * "Мой лагерь" — посты лагеря с закрепами сверху, затем по дате.
     * Используется для filter=my-camp.
     */
    @Query("SELECT p FROM Post p WHERE p.campId = :campId " +
            "AND p.moderationStatus = 'PUBLISHED' " +
            "ORDER BY p.pinned DESC, p.pinnedOrder DESC NULLS LAST, p.createdAt DESC")
    Page<Post> findPublishedByCampId(@Param("campId") UUID campId, Pageable pageable);

    /**
     * "Все" — посты лагеря только по дате, без поднятия закрепов.
     * Закреп не выпрыгивает наверх — лента хронологическая.
     */
    @Query("SELECT p FROM Post p WHERE p.campId = :campId " +
            "AND p.moderationStatus = 'PUBLISHED' " +
            "ORDER BY p.createdAt DESC")
    Page<Post> findPublishedByCampIdByDateDesc(@Param("campId") UUID campId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.detachmentId = :detachmentId " +
            "AND p.moderationStatus = 'PUBLISHED' " +
            "ORDER BY p.pinned DESC, p.pinnedOrder DESC NULLS LAST, p.createdAt DESC")
    Page<Post> findPublishedByDetachmentId(@Param("detachmentId") UUID detachmentId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.pinned = true " +
            "AND p.moderationStatus = 'PUBLISHED' " +
            "ORDER BY p.pinnedOrder DESC NULLS LAST, p.createdAt DESC")
    Page<Post> findPinnedPosts(Pageable pageable);

    /**
     * Вкладка "Все" — абсолютно все посты приложения по дате, без фильтрации по лагерю.
     */
    @Query("SELECT p FROM Post p ORDER BY p.createdAt DESC")
    Page<Post> findAllByDateDesc(Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.moderationStatus = 'PUBLISHED' ORDER BY p.createdAt DESC")
    Page<Post> findAllPublishedByDateDesc(Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.campId = :campId AND p.moderationStatus = :status ORDER BY p.createdAt DESC")
    Page<Post> findByCampIdAndModerationStatus(@Param("campId") UUID campId,
                                               @Param("status") PostModerationStatus status,
                                               Pageable pageable);

    boolean existsByIdAndAuthorId(UUID id, UUID authorId);
}
