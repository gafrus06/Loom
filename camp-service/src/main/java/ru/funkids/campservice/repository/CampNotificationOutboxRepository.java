package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.funkids.campservice.entity.CampNotificationOutboxEvent;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface CampNotificationOutboxRepository extends JpaRepository<CampNotificationOutboxEvent, UUID> {

    @Query(value = """
            select * from camp_notification_outbox
            where published_at is null
            order by created_at
            limit :batchSize
            for update skip locked
            """, nativeQuery = true)
    List<CampNotificationOutboxEvent> lockNextBatch(@Param("batchSize") int batchSize);

    List<CampNotificationOutboxEvent> findByPublishedAtBefore(OffsetDateTime threshold);
}
