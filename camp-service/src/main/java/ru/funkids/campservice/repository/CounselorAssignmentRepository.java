package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.funkids.campservice.entity.CounselorAssignment;
import ru.funkids.campservice.entity.DetachmentRole;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CounselorAssignmentRepository extends JpaRepository<CounselorAssignment, UUID> {

    List<CounselorAssignment> findByDetachmentIdAndActiveTrue(UUID detachmentId);

    boolean existsByDetachmentIdAndUserIdAndActiveTrue(UUID detachmentId, UUID userId);

    List<CounselorAssignment> findByUserIdAndActiveTrue(UUID userId);

    /**
     * Найти активное назначение конкретного вожатого в конкретный отряд.
     * Используется в DetachmentSecurityService для определения роли
     * (LEAD / ASSISTANT) и в DetachmentServiceImpl при исключении.
     */
    Optional<CounselorAssignment> findByDetachmentIdAndUserIdAndActiveTrue(UUID detachmentId, UUID userId);

    /**
     * Найти все активные назначения по роли в отряде.
     * Удобно для проверки: есть ли уже LEAD в отряде.
     */
    List<CounselorAssignment> findByDetachmentIdAndRoleInDetachmentAndActiveTrue(
            UUID detachmentId, DetachmentRole roleInDetachment);

    /**
     * Найти все активные назначения вожатого в отрядах конкретного лагеря.
     * Используется при исключении вожатого из лагеря — снять со всех отрядов.
     */
    List<CounselorAssignment> findByUserIdAndDetachment_Session_Camp_IdAndActiveTrue(
            UUID userId, UUID campId);
}