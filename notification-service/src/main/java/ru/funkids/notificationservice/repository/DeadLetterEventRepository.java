package ru.funkids.notificationservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.notificationservice.entity.DeadLetterEvent;

import java.util.List;
import java.util.UUID;

public interface DeadLetterEventRepository extends JpaRepository<DeadLetterEvent, UUID> {
    List<DeadLetterEvent> findTop100ByServiceNameOrderByCreatedAtDesc(String serviceName);
}
