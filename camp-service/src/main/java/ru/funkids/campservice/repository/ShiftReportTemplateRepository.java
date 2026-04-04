package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.funkids.campservice.entity.ShiftReportTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShiftReportTemplateRepository extends JpaRepository<ShiftReportTemplate, UUID> {

    Optional<ShiftReportTemplate> findByIdAndActiveTrue(UUID id);

    List<ShiftReportTemplate> findByCampIdAndActiveTrueOrderByCreatedAtDesc(UUID campId);

    @Query("""
            SELECT t
            FROM ShiftReportTemplate t
            WHERE t.camp.id = :campId
              AND t.active = true
              AND (t.session IS NULL OR t.session.id = :sessionId)
            ORDER BY t.createdAt DESC
            """)
    List<ShiftReportTemplate> findAvailableForSession(@Param("campId") UUID campId,
                                                      @Param("sessionId") UUID sessionId);
}
