package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.ShiftTask;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface ShiftTaskRepository extends JpaRepository<ShiftTask, UUID> {
    List<ShiftTask> findBySessionIdAndTargetDateOrderByCreatedAtAsc(UUID sessionId, LocalDate targetDate);
    List<ShiftTask> findBySessionIdOrderByTargetDateAscCreatedAtAsc(UUID sessionId);
    List<ShiftTask> findByDetachmentIdAndTargetDateOrderByCreatedAtAsc(UUID detachmentId, LocalDate targetDate);
    long countBySessionId(UUID sessionId);
    long countBySessionIdIn(Set<UUID> sessionIds);
}
