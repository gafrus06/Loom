package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.funkids.campservice.entity.Session;

import java.util.List;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    List<Session> findByCampId(UUID campId);

    @Query("SELECT DISTINCT s FROM Session s " +
            "JOIN s.camp c " +
            "JOIN c.members cm " +
            "WHERE cm.userId = :userId " +
            "AND cm.role = 'OWNER' " +
            "AND cm.active = true " +
            "ORDER BY s.startDate DESC")
    List<Session> findSessionsOfOwnedCamps(@Param("userId") UUID userId);

    /**
     * Доступные сотруднику смены: только те, куда у него есть активное и принятое
     * назначение через CampMemberSession.
     */
    @Query("SELECT DISTINCT s FROM Session s, CampMemberSession cms " +
            "WHERE cms.session = s " +
            "AND cms.campMember.userId = :userId " +
            "AND cms.campMember.active = true " +
            "AND cms.active = true " +
            "AND cms.assignmentStatus = 'ACCEPTED' " +
            "ORDER BY s.startDate DESC")
    List<Session> findSessionsOfAssignedCamps(@Param("userId") UUID userId);

    @Query("SELECT CASE WHEN COUNT(cm) > 0 THEN true ELSE false END " +
            "FROM Session s " +
            "JOIN s.camp c " +
            "JOIN c.members cm " +
            "WHERE s.id = :sessionId " +
            "AND cm.userId = :userId " +
            "AND cm.role = 'OWNER' " +
            "AND cm.active = true")
    boolean isUserOwnerOfSessionCamp(@Param("sessionId") UUID sessionId, @Param("userId") UUID userId);

    @Query("SELECT CASE WHEN COUNT(cms) > 0 THEN true ELSE false END " +
            "FROM CampMemberSession cms " +
            "WHERE cms.session.id = :sessionId " +
            "AND cms.campMember.userId = :userId " +
            "AND cms.campMember.active = true " +
            "AND cms.active = true " +
            "AND cms.assignmentStatus = 'ACCEPTED'")
    boolean isUserCounselorOfSessionCamp(@Param("sessionId") UUID sessionId, @Param("userId") UUID userId);
}
