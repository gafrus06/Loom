package ru.funkids.newsfeedservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.newsfeedservice.entity.Like;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public interface LikeRepository extends JpaRepository<Like, UUID> {

    Optional<Like> findByPostIdAndUserId(UUID postId, UUID userId);

    boolean existsByPostIdAndUserId(UUID postId, UUID userId);

    long countByPostId(UUID postId);

    // Batch-запрос счётчиков для списка постов — решает N+1 при построении ленты.
    // Вместо N запросов "SELECT COUNT(*) WHERE post_id=?" делается один с GROUP BY.
    @Query("SELECT l.post.id AS postId, COUNT(l) AS cnt FROM Like l " +
            "WHERE l.post.id IN :postIds GROUP BY l.post.id")
    List<LikeCountProjection> countByPostIdIn(@Param("postIds") Set<UUID> postIds);

    // Batch-запрос: какие посты из списка лайкнул текущий пользователь
    @Query("SELECT l.post.id FROM Like l WHERE l.post.id IN :postIds AND l.userId = :userId")
    Set<UUID> findLikedPostIds(@Param("postIds") Set<UUID> postIds, @Param("userId") UUID userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM Like l WHERE l.post.id = :postId AND l.userId = :userId")
    void deleteByPostIdAndUserId(@Param("postId") UUID postId, @Param("userId") UUID userId);

    void deleteByPostId(UUID postId);

    // Проекция для batch-запроса счётчиков
    interface LikeCountProjection {
        UUID getPostId();
        Long getCnt();
    }

    // Утилитный метод: превращает результат batch-запроса в Map<postId, count>
    default Map<UUID, Long> countMapByPostIds(Set<UUID> postIds) {
        return countByPostIdIn(postIds).stream()
                .collect(Collectors.toMap(LikeCountProjection::getPostId, LikeCountProjection::getCnt));
    }
}