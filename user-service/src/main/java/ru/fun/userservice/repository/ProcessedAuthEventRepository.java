package ru.fun.userservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.fun.userservice.entity.ProcessedAuthEvent;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ProcessedAuthEventRepository extends JpaRepository<ProcessedAuthEvent, UUID> {
    List<ProcessedAuthEvent> findByProcessedAtBefore(Instant threshold);
}
