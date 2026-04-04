package ru.fun.userservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.fun.userservice.entity.PhoneVerificationOutboxEvent;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface PhoneVerificationOutboxRepository extends JpaRepository<PhoneVerificationOutboxEvent, UUID> {

    @Query(value = """
            select * from phone_verification_outbox
            where published_at is null
            order by created_at
            limit :batchSize
            for update skip locked
            """, nativeQuery = true)
    List<PhoneVerificationOutboxEvent> lockNextBatch(@Param("batchSize") int batchSize);

    List<PhoneVerificationOutboxEvent> findByPublishedAtBefore(Instant threshold);
}
