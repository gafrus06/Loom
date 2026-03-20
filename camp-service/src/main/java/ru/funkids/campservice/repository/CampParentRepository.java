package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.funkids.campservice.entity.CampParent;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CampParentRepository extends JpaRepository<CampParent, UUID> {

    /** Все привязки конкретного родителя (может быть несколько смен/лагерей) */
    List<CampParent> findByParentUserId(UUID parentUserId);

    /** Все родители конкретного лагеря */
    List<CampParent> findByCampId(UUID campId);

    /** Все родители конкретной смены */
    List<CampParent> findByCampIdAndSessionId(UUID campId, UUID sessionId);

    /**
     * Точная проверка с sessionId — основная.
     * Используется при повторном использовании инвайт-кода (idempotent).
     */
    boolean existsByCampIdAndSessionIdAndParentUserId(UUID campId, UUID sessionId, UUID parentUserId);

    /**
     * Найти конкретную привязку по всем трём ключам.
     */
    Optional<CampParent> findByCampIdAndSessionIdAndParentUserId(
            UUID campId, UUID sessionId, UUID parentUserId);

    /**
     * Проверка без sessionId — для обратной совместимости.
     * Используется в ChildApplicationServiceImpl.createApplication:
     * достаточно знать, что родитель привязан к лагерю хоть по какой-то смене.
     */
    boolean existsByCampIdAndParentUserId(UUID campId, UUID parentUserId);

    /**
     * Все пары (campId, sessionId) родителя.
     * Используется в CampServiceImpl.listParentAccessibleCamps.
     */
    @Query("SELECT cp FROM CampParent cp WHERE cp.parentUserId = :parentUserId")
    List<CampParent> findAllSessionsByParentUserId(@Param("parentUserId") UUID parentUserId);

    @Query("SELECT DISTINCT cp.campId FROM CampParent cp WHERE cp.parentUserId = :parentUserId")
    List<UUID> findDistinctCampIdsByParentUserId(@Param("parentUserId") UUID parentUserId);
}