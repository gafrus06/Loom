package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.funkids.campservice.entity.MaterialUsage;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MaterialUsageRepository extends JpaRepository<MaterialUsage, UUID> {

    // Найти использование по отряду и материалу
    Optional<MaterialUsage> findByDetachmentIdAndMaterialId(UUID detachmentId, UUID materialId);

    // Получить все использования отряда
    List<MaterialUsage> findByDetachmentIdOrderByUsedAtDesc(UUID detachmentId);

    // Получить использования отряда по типу материала
    List<MaterialUsage> findByDetachmentIdAndMaterialTypeOrderByUsedAtDesc(
            UUID detachmentId, String materialType);

    List<MaterialUsage> findByDetachmentIdAndMaterialIdIn(UUID detachmentId, Collection<UUID> materialIds);

    // Проверить, использован ли материал в отряде
    boolean existsByDetachmentIdAndMaterialId(UUID detachmentId, UUID materialId);

    // Получить количество использований материала
    long countByMaterialId(UUID materialId);

    @Query("SELECT mu.materialId, COUNT(mu) FROM MaterialUsage mu WHERE mu.materialId IN :materialIds GROUP BY mu.materialId")
    List<Object[]> countByMaterialIds(@Param("materialIds") Collection<UUID> materialIds);

    // Получить последнее использование материала в отряде
    @Query("SELECT mu FROM MaterialUsage mu WHERE mu.detachmentId = :detachmentId " +
            "AND mu.materialId = :materialId ORDER BY mu.usedAt DESC")
    List<MaterialUsage> findLastUsage(
            @Param("detachmentId") UUID detachmentId,
            @Param("materialId") UUID materialId,
            org.springframework.data.domain.Pageable pageable);

    // Получить статистику использования по отряду
    @Query("SELECT mu.materialType, COUNT(mu) FROM MaterialUsage mu " +
            "WHERE mu.detachmentId = :detachmentId GROUP BY mu.materialType")
    List<Object[]> getUsageStatsByDetachment(@Param("detachmentId") UUID detachmentId);

    // Получить использования за период
    List<MaterialUsage> findByDetachmentIdAndUsedAtBetweenOrderByUsedAtDesc(
            UUID detachmentId, OffsetDateTime start, OffsetDateTime end);
}
