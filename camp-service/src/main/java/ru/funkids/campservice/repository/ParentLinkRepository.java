package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.funkids.campservice.entity.ParentLink;
import ru.funkids.campservice.entity.ParentLinkId;

import java.util.List;
import java.util.UUID;

@Repository
public interface ParentLinkRepository extends JpaRepository<ParentLink, ParentLinkId> {

    List<ParentLink> findByIdChildId(UUID childId);

    List<ParentLink> findByIdParentUserId(UUID parentUserId);

    boolean existsByIdChildIdAndIdParentUserId(UUID childId, UUID parentUserId);

    @Query("SELECT pl FROM ParentLink pl WHERE pl.id.parentUserId = :parentUserId")
    List<ParentLink> findByParentUserId(@Param("parentUserId") UUID parentUserId);

    @Query("SELECT pl FROM ParentLink pl WHERE pl.id.childId = :childId")
    List<ParentLink> findByChildId(@Param("childId") UUID childId);

    /**
     * Проверка: является ли пользователь родителем данного ребёнка.
     * Используется в DetachmentSecurityService и ChildController
     * для проверки прав редактирования/просмотра.
     */
    @Query("SELECT COUNT(pl) > 0 FROM ParentLink pl WHERE pl.id.parentUserId = :parentUserId AND pl.id.childId = :childId")
    boolean existsByParentUserIdAndChildId(
            @Param("parentUserId") UUID parentUserId,
            @Param("childId") UUID childId
    );
}