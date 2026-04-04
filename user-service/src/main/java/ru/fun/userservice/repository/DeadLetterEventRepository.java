package ru.fun.userservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.fun.userservice.entity.DeadLetterEvent;

import java.util.List;
import java.util.UUID;

public interface DeadLetterEventRepository extends JpaRepository<DeadLetterEvent, UUID> {
    List<DeadLetterEvent> findTop100ByServiceNameOrderByCreatedAtDesc(String serviceName);
}
