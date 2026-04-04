package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.funkids.campservice.entity.AssignmentStatus;
import ru.funkids.campservice.entity.CampMemberSession;
import ru.funkids.campservice.entity.StaffSubRole;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CampMemberSessionRepository extends JpaRepository<CampMemberSession, UUID> {

    List<CampMemberSession> findByCampMemberId(UUID campMemberId);

    List<CampMemberSession> findBySessionId(UUID sessionId);

    List<CampMemberSession> findBySessionIdAndAssignmentStatusAndActiveTrue(UUID sessionId, AssignmentStatus assignmentStatus);

    List<CampMemberSession> findByCampMemberUserIdAndAssignmentStatusAndActiveTrue(UUID userId, AssignmentStatus assignmentStatus);

    List<CampMemberSession> findByCampMemberUserIdAndActiveTrue(UUID userId);
    List<CampMemberSession> findByCampMemberIdAndActiveTrue(UUID campMemberId);

    boolean existsByCampMemberIdAndSessionId(UUID campMemberId, UUID sessionId);

    Optional<CampMemberSession> findByCampMemberIdAndSessionId(UUID campMemberId, UUID sessionId);

    @Query("""
            SELECT COUNT(cms) > 0
            FROM CampMemberSession cms
            WHERE cms.session.id = :sessionId
              AND cms.campMember.userId = :userId
              AND cms.campMember.camp.id = :campId
              AND cms.campMember.active = true
              AND cms.active = true
              AND cms.assignmentStatus = 'ACCEPTED'
            """)
    boolean existsAcceptedBySessionIdAndUserIdAndCampId(
            @Param("sessionId") UUID sessionId,
            @Param("userId") UUID userId,
            @Param("campId") UUID campId
    );

    @Query("""
            SELECT COUNT(cms) > 0
            FROM CampMemberSession cms
            WHERE cms.session.id = :sessionId
              AND cms.campMember.userId = :userId
              AND cms.campMember.camp.id = :campId
              AND cms.campMember.active = true
              AND cms.active = true
              AND cms.assignmentStatus = 'ACCEPTED'
              AND cms.subRole = :subRole
            """)
    boolean existsAcceptedBySessionIdAndUserIdAndCampIdAndSubRole(
            @Param("sessionId") UUID sessionId,
            @Param("userId") UUID userId,
            @Param("campId") UUID campId,
            @Param("subRole") StaffSubRole subRole
    );

    @Query("""
            SELECT cms
            FROM CampMemberSession cms
            WHERE cms.active = true
              AND cms.assignmentStatus = 'ACCEPTED'
              AND cms.session.endDate < :today
              AND cms.autoDetachedAt IS NULL
            """)
    List<CampMemberSession> findAcceptedExpiredAssignments(@Param("today") LocalDate today);

    void deleteByCampMemberId(UUID campMemberId);
}
