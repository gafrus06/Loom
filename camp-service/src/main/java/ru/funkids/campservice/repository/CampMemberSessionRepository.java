package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.funkids.campservice.entity.CampMemberSession;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CampMemberSessionRepository extends JpaRepository<CampMemberSession, UUID> {

    /** Все смены, к которым привязан данный вожатый (по записи CampMember) */
    List<CampMemberSession> findByCampMemberId(UUID campMemberId);

    /** Все привязки к конкретной смене (кто назначен в эту смену) */
    List<CampMemberSession> findBySessionId(UUID sessionId);

    /** Проверка: назначен ли данный вожатый (CampMember) на данную смену */
    boolean existsByCampMemberIdAndSessionId(UUID campMemberId, UUID sessionId);

    /** Найти конкретную привязку по CampMember + Session (для точечного удаления) */
    Optional<CampMemberSession> findByCampMemberIdAndSessionId(UUID campMemberId, UUID sessionId);

    /**
     * Проверка: имеет ли пользователь (userId) доступ к данной смене
     * через CampMember в указанном лагере.
     */
    @Query("""
            SELECT COUNT(cms) > 0
            FROM CampMemberSession cms
            WHERE cms.session.id = :sessionId
              AND cms.campMember.userId = :userId
              AND cms.campMember.camp.id = :campId
              AND cms.campMember.active = true
            """)
    boolean existsBySessionIdAndUserIdAndCampId(
            @Param("sessionId") UUID sessionId,
            @Param("userId") UUID userId,
            @Param("campId") UUID campId
    );

    /** Удалить все привязки вожатого к сменам (при исключении из лагеря) */
    void deleteByCampMemberId(UUID campMemberId);
}