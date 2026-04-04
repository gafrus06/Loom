package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.DetachmentDailyReport;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface DetachmentDailyReportRepository extends JpaRepository<DetachmentDailyReport, UUID> {

    Optional<DetachmentDailyReport> findByDetachmentIdAndReportDate(UUID detachmentId, LocalDate reportDate);

    List<DetachmentDailyReport> findByDetachmentIdOrderByReportDateDescCreatedAtDesc(UUID detachmentId);

    List<DetachmentDailyReport> findBySessionIdOrderByReportDateDescCreatedAtDesc(UUID sessionId);

    long countBySessionId(UUID sessionId);

    long countBySessionIdIn(Set<UUID> sessionIds);
}
