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

    Optional<CounselorAssignment> findByDetachmentIdAndUserIdAndActiveTrue(UUID detachmentId, UUID userId);

    List<CounselorAssignment> findByDetachmentIdAndRoleInDetachmentAndActiveTrue(
            UUID detachmentId, DetachmentRole roleInDetachment);

    List<CounselorAssignment> findByUserIdAndDetachment_Session_Camp_IdAndActiveTrue(
            UUID userId, UUID campId);

    List<CounselorAssignment> findByUserIdAndDetachment_Session_IdAndActiveTrue(UUID userId, UUID sessionId);
}
