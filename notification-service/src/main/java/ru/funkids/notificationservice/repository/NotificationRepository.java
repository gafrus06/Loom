package ru.funkids.notificationservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.funkids.notificationservice.entity.NotificationRecord;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<NotificationRecord, UUID> {

    List<NotificationRecord> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<NotificationRecord> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<NotificationRecord> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndReadAtIsNull(UUID userId);

    @Modifying
    @Query("""
            update NotificationRecord n
               set n.readAt = :readAt
             where n.userId = :userId
               and n.readAt is null
            """)
    int markAllRead(@Param("userId") UUID userId, @Param("readAt") OffsetDateTime readAt);
}
