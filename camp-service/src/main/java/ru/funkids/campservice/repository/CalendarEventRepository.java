package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.CalendarEvent;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {
    List<CalendarEvent> findBySessionIdOrderByEventDateAsc(UUID sessionId);
    List<CalendarEvent> findBySessionIdAndVisibleForParentsTrueOrderByEventDateAsc(UUID sessionId);
    List<CalendarEvent> findBySessionIdAndEventDateOrderByCreatedAtAsc(UUID sessionId, LocalDate eventDate);
}
