package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.entity.FavoriteMaterial;
import ru.funkids.campservice.entity.Material;
import ru.funkids.campservice.entity.MaterialUsage;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.DetachmentRepository;
import ru.funkids.campservice.repository.FavoriteMaterialRepository;
import ru.funkids.campservice.repository.MaterialRepository;
import ru.funkids.campservice.repository.MaterialUsageRepository;
import ru.funkids.campservice.security.DetachmentSecurityService;
import ru.funkids.campservice.service.MaterialService;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MaterialServiceImpl implements MaterialService {

    private final MaterialRepository materialRepository;
    private final MaterialUsageRepository materialUsageRepository;
    private final FavoriteMaterialRepository favoriteMaterialRepository;
    private final DetachmentSecurityService detachmentSecurityService;
    private final DetachmentRepository detachmentRepository;

    // Константы для типов материалов
    private static final String TYPE_GAME = "GAME";
    private static final String TYPE_CAMPFIRE = "CAMPFIRE";
    private static final String TYPE_EXERCISE = "EXERCISE";
    private static final String TYPE_PHYSIOLOGICAL = "PHYSIOLOGICAL";

    @Override
    @Transactional(readOnly = true)
    public List<MaterialDto> getGames(UUID detachmentId, String stage) {
        log.info("Getting games for detachment: {}, stage: {}", detachmentId, stage);

        // Сначала получаем возрастную группу отряда (нужно будет добавить метод в DetachmentService)
        String ageGroup = getDetachmentAgeGroup(detachmentId);

        List<Material> materials = materialRepository.findByTypeAndStageAndAgeGroup(
                TYPE_GAME, stage, ageGroup);

        // Если нет материалов для конкретной возрастной группы, берем общие
        if (materials.isEmpty()) {
            materials = materialRepository.findByTypeAndStageAndAgeGroup(
                    TYPE_GAME, stage, "ALL");
        }

        return materials.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialDto> getCampfires(UUID detachmentId, String stage) {
        log.info("Getting campfires for detachment: {}, stage: {}", detachmentId, stage);

        String ageGroup = getDetachmentAgeGroup(detachmentId);

        List<Material> materials = materialRepository.findByTypeAndStageAndAgeGroup(
                TYPE_CAMPFIRE, stage, ageGroup);

        if (materials.isEmpty()) {
            materials = materialRepository.findByTypeAndStageAndAgeGroup(
                    TYPE_CAMPFIRE, stage, "ALL");
        }

        return materials.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialDto> getExercises(UUID detachmentId, String stage) {
        log.info("Getting exercises for detachment: {}, stage: {}", detachmentId, stage);

        String ageGroup = getDetachmentAgeGroup(detachmentId);

        List<Material> materials = materialRepository.findByTypeAndStageAndAgeGroup(
                TYPE_EXERCISE, stage, ageGroup);

        if (materials.isEmpty()) {
            materials = materialRepository.findByTypeAndStageAndAgeGroup(
                    TYPE_EXERCISE, stage, "ALL");
        }

        return materials.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialDto> getPhysiologicalFeatures(String ageGroup) {
        log.info("Getting physiological features for age group: {}", ageGroup);

        List<Material> materials = materialRepository.findByTypeAndAgeGroupOrderByTitle(
                TYPE_PHYSIOLOGICAL, ageGroup);

        return materials.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialWithUsageDto> getGamesWithUsage(UUID detachmentId, String stage) {
        List<MaterialDto> games = getGames(detachmentId, stage);
        return enrichWithUsageInfo(games, detachmentId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialWithUsageDto> getCampfiresWithUsage(UUID detachmentId, String stage) {
        List<MaterialDto> campfires = getCampfires(detachmentId, stage);
        return enrichWithUsageInfo(campfires, detachmentId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialWithUsageDto> getExercisesWithUsage(UUID detachmentId, String stage) {
        List<MaterialDto> exercises = getExercises(detachmentId, stage);
        return enrichWithUsageInfo(exercises, detachmentId);
    }

    private List<MaterialWithUsageDto> enrichWithUsageInfo(List<MaterialDto> materials, UUID detachmentId) {
        if (materials.isEmpty()) {
            return List.of();
        }

        List<UUID> materialIds = materials.stream().map(MaterialDto::getId).toList();
        List<MaterialUsage> usages = materialUsageRepository.findByDetachmentIdAndMaterialIdIn(detachmentId, materialIds);
        Set<UUID> usedMaterialIds = usages.stream()
                .map(MaterialUsage::getMaterialId)
                .collect(Collectors.toSet());
        Map<UUID, OffsetDateTime> lastUsedByMaterial = usages.stream()
                .collect(Collectors.toMap(
                        MaterialUsage::getMaterialId,
                        MaterialUsage::getUsedAt,
                        (left, right) -> left.isAfter(right) ? left : right
                ));
        Map<UUID, Long> usageCounts = materialUsageRepository.countByMaterialIds(materialIds).stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> (Long) row[1]
                ));

        return materials.stream()
                .map(material -> {
                    boolean isUsed = usedMaterialIds.contains(material.getId());
                    OffsetDateTime lastUsedAt = lastUsedByMaterial.get(material.getId());
                    long usageCount = usageCounts.getOrDefault(material.getId(), 0L);

                    return MaterialWithUsageDto.builder()
                            .id(material.getId())
                            .title(material.getTitle())
                            .type(material.getType())
                            .stage(material.getStage())
                            .ageGroup(material.getAgeGroup())
                            .description(material.getDescription())
                            .duration(material.getDuration())
                            .players(material.getPlayers())
                            .materials(material.getMaterials())
                            .purpose(material.getPurpose())
                            .form(material.getForm())
                            .atmosphere(material.getAtmosphere())
                            .difficulty(material.getDifficulty())
                            .effect(material.getEffect())
                            .recommendations(material.getRecommendations())
                            .content(material.getContent())
                            .isUsed(isUsed)
                            .lastUsedAt(lastUsedAt)
                            .usageCount((int) usageCount)
                            .build();
                })
                .collect(Collectors.toList());
    }

    @Override
    public void addToFavorites(UUID detachmentId, UUID materialId, String materialType, UUID userId) {
        log.info("Adding material {} to favorites for detachment {}", materialId, detachmentId);

        // Проверяем доступ к отряду
        detachmentSecurityService.checkAccessToDetachment(detachmentId, userId);

        // Проверяем, не в избранном ли уже
        boolean exists = favoriteMaterialRepository.existsByDetachmentIdAndMaterialIdAndMaterialType(
                detachmentId, materialId, materialType);

        if (!exists) {
            FavoriteMaterial favorite = FavoriteMaterial.builder()
                    .detachmentId(detachmentId)
                    .materialId(materialId)
                    .materialType(materialType)
                    .addedAt(OffsetDateTime.now())
                    .addedBy(userId)
                    .build();

            favoriteMaterialRepository.save(favorite);
            log.info("Material added to favorites");
        }
    }

    @Override
    public void removeFromFavorites(UUID detachmentId, UUID materialId, String materialType) {
        log.info("Removing material {} from favorites for detachment {}", materialId, detachmentId);

        favoriteMaterialRepository.deleteByDetachmentIdAndMaterialIdAndMaterialType(
                detachmentId, materialId, materialType);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialDto> getFavorites(UUID detachmentId, String materialType) {
        log.info("Getting favorites for detachment: {}, type: {}", detachmentId, materialType);

        List<FavoriteMaterial> favorites = favoriteMaterialRepository
                .findByDetachmentIdAndMaterialTypeOrderByAddedAtDesc(detachmentId, materialType);

        List<MaterialDto> result = new ArrayList<>();

        for (FavoriteMaterial fav : favorites) {
            materialRepository.findById(fav.getMaterialId())
                    .ifPresent(material -> result.add(mapToDto(material)));
        }

        return result;
    }

    @Override
    public MaterialUsageDto markAsUsed(UUID detachmentId, UUID materialId, String materialType,
                                       String stage, UUID userId, String notes) {
        log.info("Marking material {} as used in detachment {}", materialId, detachmentId);

        // Проверяем доступ к отряду
        detachmentSecurityService.checkAccessToDetachment(detachmentId, userId);

        // Проверяем, существует ли материал
        Material material = materialRepository.findById(materialId)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + materialId));

        // Проверяем, не отмечали ли уже
        Optional<MaterialUsage> existing = materialUsageRepository
                .findByDetachmentIdAndMaterialId(detachmentId, materialId);

        MaterialUsage usage;

        if (existing.isPresent()) {
            // Обновляем существующую запись
            usage = existing.get();
            usage.setUsedAt(OffsetDateTime.now());
            usage.setStage(stage);
            usage.setUsedBy(userId);
            usage.setNotes(notes);
        } else {
            // Создаем новую
            usage = MaterialUsage.builder()
                    .detachmentId(detachmentId)
                    .materialId(materialId)
                    .materialType(materialType)
                    .usedAt(OffsetDateTime.now())
                    .stage(stage)
                    .usedBy(userId)
                    .notes(notes)
                    .build();
        }

        MaterialUsage saved = materialUsageRepository.save(usage);
        log.info("Material marked as used with id: {}", saved.getId());

        return mapToUsageDto(saved, material.getTitle());
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialUsageDto> getUsageHistory(UUID detachmentId) {
        log.info("Getting usage history for detachment: {}", detachmentId);

        List<MaterialUsage> usages = materialUsageRepository
                .findByDetachmentIdOrderByUsedAtDesc(detachmentId);

        Map<UUID, String> titlesById = materialRepository.findAllById(
                        usages.stream().map(MaterialUsage::getMaterialId).distinct().toList()
                ).stream()
                .collect(Collectors.toMap(Material::getId, Material::getTitle));

        return usages.stream()
                .map(usage -> mapToUsageDto(usage, titlesById.get(usage.getMaterialId())))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isMaterialUsed(UUID detachmentId, UUID materialId) {
        return materialUsageRepository.existsByDetachmentIdAndMaterialId(detachmentId, materialId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialRecommendationDto> getRecommendedForStage(UUID detachmentId, String stage) {
        log.info("Getting recommendations for detachment: {}, stage: {}", detachmentId, stage);

        List<String> types = Arrays.asList(TYPE_GAME, TYPE_CAMPFIRE, TYPE_EXERCISE);
        List<Material> materials = materialRepository.findRecommendedForStage(types, stage);

        // Берем первые 3-4 материала
        return materials.stream()
                .limit(4)
                .map(material -> MaterialRecommendationDto.builder()
                        .id(material.getId())
                        .title(material.getTitle())
                        .type(material.getType().toLowerCase())
                        .stage(material.getStage())
                        .reason(getRecommendationReason(material))
                        .priority(calculatePriority(material))
                        .build())
                .collect(Collectors.toList());
    }

    private String getRecommendationReason(Material material) {
        switch (material.getType()) {
            case TYPE_GAME:
                return "Идеально подходит для этого этапа";
            case TYPE_CAMPFIRE:
                return "Рекомендуемый огонек";
            case TYPE_EXERCISE:
                return "Эффективное упражнение";
            default:
                return "Рекомендуемый материал";
        }
    }

    private Integer calculatePriority(Material material) {
        // Приоритет 1-10, где 1 - самый высокий
        switch (material.getType()) {
            case TYPE_GAME:
                return 1;
            case TYPE_EXERCISE:
                return 2;
            case TYPE_CAMPFIRE:
                return 3;
            default:
                return 5;
        }
    }

    @Override
    public MaterialDto createMaterial(MaterialDto dto, UUID creatorId) {
        log.info("Creating new material: {}", dto.getTitle());

        Material material = Material.builder()
                .title(dto.getTitle())
                .type(dto.getType())
                .stage(dto.getStage())
                .ageGroup(dto.getAgeGroup())
                .description(dto.getDescription())
                .duration(dto.getDuration())
                .players(dto.getPlayers())
                .materials(dto.getMaterials())
                .purpose(dto.getPurpose())
                .form(dto.getForm())
                .atmosphere(dto.getAtmosphere())
                .difficulty(dto.getDifficulty())
                .effect(dto.getEffect())
                .recommendations(dto.getRecommendations())
                .content(dto.getContent())
                .build();

        Material saved = materialRepository.save(material);
        log.info("Material created with id: {}", saved.getId());

        return mapToDto(saved);
    }

    @Override
    public MaterialDto updateMaterial(UUID id, MaterialDto dto) {
        log.info("Updating material: {}", id);

        Material material = materialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + id));

        if (dto.getTitle() != null) material.setTitle(dto.getTitle());
        if (dto.getType() != null) material.setType(dto.getType());
        if (dto.getStage() != null) material.setStage(dto.getStage());
        if (dto.getAgeGroup() != null) material.setAgeGroup(dto.getAgeGroup());
        if (dto.getDescription() != null) material.setDescription(dto.getDescription());
        if (dto.getDuration() != null) material.setDuration(dto.getDuration());
        if (dto.getPlayers() != null) material.setPlayers(dto.getPlayers());
        if (dto.getMaterials() != null) material.setMaterials(dto.getMaterials());
        if (dto.getPurpose() != null) material.setPurpose(dto.getPurpose());
        if (dto.getForm() != null) material.setForm(dto.getForm());
        if (dto.getAtmosphere() != null) material.setAtmosphere(dto.getAtmosphere());
        if (dto.getDifficulty() != null) material.setDifficulty(dto.getDifficulty());
        if (dto.getEffect() != null) material.setEffect(dto.getEffect());
        if (dto.getRecommendations() != null) material.setRecommendations(dto.getRecommendations());
        if (dto.getContent() != null) material.setContent(dto.getContent());

        Material updated = materialRepository.save(material);
        log.info("Material updated: {}", id);

        return mapToDto(updated);
    }

    @Override
    public void deleteMaterial(UUID id) {
        log.info("Deleting material: {}", id);
        materialRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public MaterialDto getMaterial(UUID id) {
        log.info("Getting material: {}", id);

        Material material = materialRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Material not found: " + id));

        return mapToDto(material);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaterialDto> getAllMaterials(String type) {
        log.info("Getting all materials of type: {}", type);

        List<Material> materials = materialRepository.findByTypeOrderByStageAscTitleAsc(type);

        return materials.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // Вспомогательные методы

    private MaterialDto mapToDto(Material material) {
        return MaterialDto.builder()
                .id(material.getId())
                .title(material.getTitle())
                .type(material.getType())
                .stage(material.getStage())
                .ageGroup(material.getAgeGroup())
                .description(material.getDescription())
                .duration(material.getDuration())
                .players(material.getPlayers())
                .materials(material.getMaterials())
                .purpose(material.getPurpose())
                .form(material.getForm())
                .atmosphere(material.getAtmosphere())
                .difficulty(material.getDifficulty())
                .effect(material.getEffect())
                .recommendations(material.getRecommendations())
                .content(material.getContent())
                .build();
    }

    private MaterialUsageDto mapToUsageDto(MaterialUsage usage, String materialTitle) {
        return MaterialUsageDto.builder()
                .id(usage.getId())
                .detachmentId(usage.getDetachmentId())
                .materialId(usage.getMaterialId())
                .materialType(usage.getMaterialType())
                .usedAt(usage.getUsedAt())
                .stage(usage.getStage())
                .usedBy(usage.getUsedBy())
                .notes(usage.getNotes())
                .materialTitle(materialTitle)
                .build();
    }

    // TODO: Добавить метод в DetachmentService для получения возрастной группы
    private String getDetachmentAgeGroup(UUID detachmentId) {
        return detachmentRepository.findById(detachmentId).orElseThrow(() -> new RuntimeException("Detachment not found")).getAgeGroup();
         // Заглушка
    }
}
