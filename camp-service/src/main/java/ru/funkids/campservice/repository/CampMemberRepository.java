package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.funkids.campservice.entity.Camp;
import ru.funkids.campservice.entity.CampMember;
import ru.funkids.campservice.entity.CampRole;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CampMemberRepository extends JpaRepository<CampMember, UUID> {

    List<CampMember> findByCampIdAndActiveTrue(UUID campId);

    List<CampMember> findByUserIdAndActiveTrue(UUID userId);

    Optional<CampMember> findByCampIdAndUserIdAndActiveTrue(UUID campId, UUID userId);

    List<CampMember> findByCampIdAndUserId(UUID campId, UUID userId);

    boolean existsByCampIdAndUserIdAndActiveTrue(UUID campId, UUID userId);

    boolean existsByCampIdAndUserIdAndRoleAndActiveTrue(UUID campId, UUID userId, CampRole role);

    // -------------------------------------------------------------------------
    // Используется в CampSecurityService.canCreateDetachmentInSession
    // Проверяет: есть ли у пользователя активное членство в лагере этой смены
    // с данной ролью.
    // -------------------------------------------------------------------------
    @Query("""
            SELECT COUNT(cm) > 0 FROM CampMember cm
            JOIN cm.camp c
            JOIN c.sessions s
            WHERE s.id    = :sessionId
              AND cm.userId = :userId
              AND cm.role   = :role
              AND cm.active = true
            """)
    boolean existsByCampSessionIdAndUserIdAndRoleAndActiveTrue(
            @Param("sessionId") UUID sessionId,
            @Param("userId")    UUID userId,
            @Param("role")      CampRole role);

    // -------------------------------------------------------------------------
    // Используется в CampSecurityService.canManageDetachment
    // Проверяет: есть ли у пользователя активное членство в лагере этого отряда
    // -------------------------------------------------------------------------
    @Query("""
            SELECT COUNT(cm) > 0 FROM CampMember cm
            JOIN cm.camp c
            JOIN c.sessions s
            JOIN s.detachments d
            WHERE d.id    = :detachmentId
              AND cm.userId = :userId
              AND cm.role   = :role
              AND cm.active = true
            """)
    boolean existsByCampDetachmentIdAndUserIdAndRoleAndActiveTrue(
            @Param("detachmentId") UUID detachmentId,
            @Param("userId")       UUID userId,
            @Param("role")         CampRole role);

    // -------------------------------------------------------------------------
    // Используется в CampServiceImpl.listStaffAccessibleCamps
    // -------------------------------------------------------------------------
    @Query("""
            SELECT DISTINCT c FROM Camp c
            JOIN c.members cm
            WHERE cm.userId = :userId
              AND cm.role   = 'OWNER'
              AND cm.active = true
            """)
    List<Camp> findOwnedByUser(@Param("userId") UUID userId);

    @Query("""
            SELECT DISTINCT c FROM Camp c
            JOIN c.members cm
            WHERE cm.userId = :userId
              AND cm.role   = 'COUNSELOR'
              AND cm.active = true
            """)
    List<Camp> findAssignedToUser(@Param("userId") UUID userId);
}