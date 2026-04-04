package ru.funkids.notificationservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.notificationservice.entity.ProcessedInboundEvent;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface ProcessedInboundEventRepository extends JpaRepository<ProcessedInboundEvent, UUID> {

    List<ProcessedInboundEvent> findByProcessedAtBefore(OffsetDateTime threshold);
}
