package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.SeniorCounselorNoticeAttachment;

import java.util.List;
import java.util.UUID;

public interface SeniorCounselorNoticeAttachmentRepository extends JpaRepository<SeniorCounselorNoticeAttachment, UUID> {
    List<SeniorCounselorNoticeAttachment> findByNoticeIdOrderByCreatedAtAsc(UUID noticeId);
    void deleteByNoticeId(UUID noticeId);
}
