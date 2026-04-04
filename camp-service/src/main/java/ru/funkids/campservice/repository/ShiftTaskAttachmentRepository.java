package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.ShiftTaskAttachment;

import java.util.List;
import java.util.UUID;

public interface ShiftTaskAttachmentRepository extends JpaRepository<ShiftTaskAttachment, UUID> {
    List<ShiftTaskAttachment> findByTaskIdOrderByCreatedAtAsc(UUID taskId);
    void deleteByTaskId(UUID taskId);
}
