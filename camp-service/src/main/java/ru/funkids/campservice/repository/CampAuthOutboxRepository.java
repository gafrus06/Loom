package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.funkids.campservice.entity.CampAuthOutboxEvent;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface CampAuthOutboxRepository extends JpaRepository<CampAuthOutboxEvent, UUID> {

    @Query(value = """
            select * from camp_auth_outbox
            where published_at is null
            order by created_at
            limit :batchSize
            for update skip locked
            """, nativeQuery = true)
    List<CampAuthOutboxEvent> lockNextBatch(@Param("batchSize") int batchSize);

    List<CampAuthOutboxEvent> findByPublishedAtBefore(OffsetDateTime threshold);
}
