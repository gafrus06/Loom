package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.funkids.campservice.entity.FavoriteMaterial;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FavoriteMaterialRepository extends JpaRepository<FavoriteMaterial, UUID> {

    // Получить избранное отряда
    List<FavoriteMaterial> findByDetachmentIdOrderByAddedAtDesc(UUID detachmentId);

    // Получить избранное отряда по типу
    List<FavoriteMaterial> findByDetachmentIdAndMaterialTypeOrderByAddedAtDesc(
            UUID detachmentId, String materialType);

    // Проверить, есть ли материал в избранном
    boolean existsByDetachmentIdAndMaterialIdAndMaterialType(
            UUID detachmentId, UUID materialId, String materialType);

    // Удалить из избранного
    void deleteByDetachmentIdAndMaterialIdAndMaterialType(
            UUID detachmentId, UUID materialId, String materialType);

    // Найти конкретное избранное
    Optional<FavoriteMaterial> findByDetachmentIdAndMaterialIdAndMaterialType(
            UUID detachmentId, UUID materialId, String materialType);

    // Удалить все избранное отряда
    void deleteByDetachmentId(UUID detachmentId);
}