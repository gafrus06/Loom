package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.funkids.campservice.entity.DetachmentMembership;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface DetachmentMembershipRepository extends JpaRepository<DetachmentMembership, UUID> {

    List<DetachmentMembership> findByDetachmentId(UUID detachmentId);
    List<DetachmentMembership> findByChildId(UUID childId);
    List<DetachmentMembership> findByDetachmentIdIn(List<UUID> detachmentIds);

    @Query("SELECT dm FROM DetachmentMembership dm WHERE dm.detachment.id = :detachmentId AND dm.leftAt IS NULL")
    List<DetachmentMembership> findActiveByDetachmentId(@Param("detachmentId") UUID detachmentId);

    @Query("SELECT dm FROM DetachmentMembership dm WHERE dm.child.id IN :childIds AND dm.leftAt IS NULL")
    List<DetachmentMembership> findActiveByChildIds(@Param("childIds") Set<UUID> childIds);

    @Query("SELECT dm FROM DetachmentMembership dm WHERE dm.child.id IN :childIds")
    List<DetachmentMembership> findByChildIds(@Param("childIds") Set<UUID> childIds);

    Optional<DetachmentMembership> findByChildIdAndLeftAtIsNull(UUID childId);

    @Query("SELECT dm FROM DetachmentMembership dm WHERE dm.child.id = :childId AND dm.leftAt IS NULL")
    Optional<DetachmentMembership> findActiveMembershipByChildId(@Param("childId") UUID childId);

    boolean existsByDetachmentIdAndChildIdAndLeftAtIsNull(UUID detachmentId, UUID childId);

    @Query("SELECT COUNT(dm) > 0 FROM DetachmentMembership dm WHERE dm.child.id = :childId AND dm.detachment.id = :detachmentId AND dm.leftAt IS NULL")
    boolean isChildActiveInDetachment(@Param("childId") UUID childId, @Param("detachmentId") UUID detachmentId);
}
