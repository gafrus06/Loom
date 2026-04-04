package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.ShiftTaskChecklistItem;

import java.util.List;
import java.util.UUID;

public interface ShiftTaskChecklistItemRepository extends JpaRepository<ShiftTaskChecklistItem, UUID> {
    List<ShiftTaskChecklistItem> findByTaskIdOrderBySortOrderAsc(UUID taskId);
    void deleteByTaskId(UUID taskId);
}
