package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.*;

import java.util.List;
import java.util.UUID;

public interface MaterialService {

    // Получение материалов
    List<MaterialDto> getGames(UUID detachmentId, String stage);
    List<MaterialDto> getCampfires(UUID detachmentId, String stage);
    List<MaterialDto> getExercises(UUID detachmentId, String stage);
    List<MaterialDto> getPhysiologicalFeatures(String ageGroup);

    // Получение материалов с информацией об использовании
    List<MaterialWithUsageDto> getGamesWithUsage(UUID detachmentId, String stage);
    List<MaterialWithUsageDto> getCampfiresWithUsage(UUID detachmentId, String stage);
    List<MaterialWithUsageDto> getExercisesWithUsage(UUID detachmentId, String stage);

    // Работа с избранным
    void addToFavorites(UUID detachmentId, UUID materialId, String materialType, UUID userId);
    void removeFromFavorites(UUID detachmentId, UUID materialId, String materialType);
    List<MaterialDto> getFavorites(UUID detachmentId, String materialType);

    // Отметка использования
    MaterialUsageDto markAsUsed(UUID detachmentId, UUID materialId, String materialType,
                                String stage, UUID userId, String notes);
    List<MaterialUsageDto> getUsageHistory(UUID detachmentId);
    boolean isMaterialUsed(UUID detachmentId, UUID materialId);

    // Рекомендации
    List<MaterialRecommendationDto> getRecommendedForStage(UUID detachmentId, String stage);

    // CRUD для материалов (только для ADMIN)
    MaterialDto createMaterial(MaterialDto dto, UUID creatorId);
    MaterialDto updateMaterial(UUID id, MaterialDto dto);
    void deleteMaterial(UUID id);
    MaterialDto getMaterial(UUID id);
    List<MaterialDto> getAllMaterials(String type);
}