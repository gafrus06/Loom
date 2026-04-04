package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.funkids.campservice.entity.Detachment;

import java.util.List;
import java.util.UUID;

@Repository
public interface DetachmentRepository extends JpaRepository<Detachment, UUID> {

    List<Detachment> findBySessionId(UUID sessionId);

    List<Detachment> findBySession_Camp_Id(UUID campId);

    @Query("SELECT DISTINCT d FROM Detachment d JOIN d.counselors ca WHERE ca.userId = :counselorId ORDER BY d.name")
    List<Detachment> findAssignedToCounselor(@Param("counselorId") UUID counselorId);

    @Query("SELECT CASE WHEN COUNT(d) > 0 THEN true ELSE false END FROM Detachment d WHERE d.id = :detachmentId AND d.creatorId = :userId")
    boolean isCreator(@Param("detachmentId") UUID detachmentId,
                      @Param("userId") UUID userId);

    @Query("SELECT DISTINCT d FROM Detachment d JOIN d.session s JOIN s.camp c JOIN c.members cm WHERE cm.userId = :userId AND cm.role = 'OWNER' AND cm.active = true ORDER BY d.name")
    List<Detachment> findDetachmentsOfOwnedCamps(@Param("userId") UUID userId);

    @Query("SELECT DISTINCT d FROM Detachment d JOIN d.session s JOIN s.camp c JOIN c.members cm WHERE cm.userId = :userId AND cm.role = 'COUNSELOR' AND cm.active = true ORDER BY d.name")
    List<Detachment> findDetachmentsOfAssignedCamps(@Param("userId") UUID userId);

    @Query("SELECT CASE WHEN COUNT(ca) > 0 THEN true ELSE false END FROM CounselorAssignment ca WHERE ca.detachment.id = :detachmentId AND ca.userId = :userId")
    boolean isUserAssignedToDetachment(@Param("detachmentId") UUID detachmentId,
                                       @Param("userId") UUID userId);

    @Query("SELECT CASE WHEN COUNT(cm) > 0 THEN true ELSE false END FROM Detachment d JOIN d.session s JOIN s.camp c JOIN c.members cm WHERE d.id = :detachmentId AND cm.userId = :userId AND cm.role = 'OWNER' AND cm.active = true")
    boolean isUserOwnerOfDetachmentCamp(@Param("detachmentId") UUID detachmentId,
                                        @Param("userId") UUID userId);
}
