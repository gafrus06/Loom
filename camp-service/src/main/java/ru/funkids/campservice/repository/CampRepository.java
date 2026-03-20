package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.funkids.campservice.entity.Camp;

import java.util.List;
import java.util.UUID;

@Repository
public interface CampRepository extends JpaRepository<Camp, UUID> {

    List<Camp> findByOwnerId(UUID ownerId);

    /**
     * Найти лагеря где пользователь является OWNER (через CampMember)
     */
    @Query("SELECT DISTINCT c FROM Camp c " +
            "JOIN c.members cm " +
            "WHERE cm.userId = :userId " +
            "AND cm.role = 'OWNER' " +
            "AND cm.active = true")
    List<Camp> findOwnedByUser(@Param("userId") UUID userId);

    /**
     * Найти лагеря где пользователь является COUNSELOR (через CampMember)
     */
    @Query("SELECT DISTINCT c FROM Camp c " +
            "JOIN c.members cm " +
            "WHERE cm.userId = :userId " +
            "AND cm.role = 'COUNSELOR' " +
            "AND cm.active = true")
    List<Camp> findAssignedToUser(@Param("userId") UUID userId);

    /**
     * Проверить является ли пользователь владельцем лагеря
     */
    @Query("SELECT CASE WHEN COUNT(cm) > 0 THEN true ELSE false END " +
            "FROM CampMember cm " +
            "WHERE cm.camp.id = :campId " +
            "AND cm.userId = :userId " +
            "AND cm.role = 'OWNER' " +
            "AND cm.active = true")
    boolean isUserOwnerOfCamp(@Param("campId") UUID campId, @Param("userId") UUID userId);

    /**
     * Проверить является ли пользователь назначенным вожатым в лагере
     */
    @Query("SELECT CASE WHEN COUNT(cm) > 0 THEN true ELSE false END " +
            "FROM CampMember cm " +
            "WHERE cm.camp.id = :campId " +
            "AND cm.userId = :userId " +
            "AND cm.role = 'COUNSELOR' " +
            "AND cm.active = true")
    boolean isUserCounselorOfCamp(@Param("campId") UUID campId, @Param("userId") UUID userId);
}