package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.ShiftTaskCompletion;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface ShiftTaskCompletionRepository extends JpaRepository<ShiftTaskCompletion, UUID> {
    Optional<ShiftTaskCompletion> findByTaskIdAndCounselorUserIdAndDetachmentId(UUID taskId, UUID counselorUserId, UUID detachmentId);
    List<ShiftTaskCompletion> findAllByTaskIdAndDetachmentId(UUID taskId, UUID detachmentId);
    List<ShiftTaskCompletion> findByTaskId(UUID taskId);
    long countByTaskIdAndCompletedTrue(UUID taskId);
    long countByTaskSessionIdAndCompletedTrue(UUID sessionId);
    long countByTaskSessionIdInAndCompletedTrue(Set<UUID> sessionIds);
}
