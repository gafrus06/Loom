package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.SeniorCounselorNotice;

import java.util.List;
import java.util.UUID;

public interface SeniorCounselorNoticeRepository extends JpaRepository<SeniorCounselorNotice, UUID> {
    List<SeniorCounselorNotice> findBySessionIdAndActiveTrueOrderByCreatedAtDesc(UUID sessionId);
    List<SeniorCounselorNotice> findBySessionIdAndDetachmentIdAndActiveTrueOrderByCreatedAtDesc(UUID sessionId, UUID detachmentId);
}
