package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.funkids.campservice.entity.Material;

import java.util.List;
import java.util.UUID;

@Repository
public interface MaterialRepository extends JpaRepository<Material, UUID> {

    // Получить материалы по типу и этапу
    List<Material> findByTypeAndStage(String type, String stage);

    // Получить материалы по типу и возрастной группе
    List<Material> findByTypeAndAgeGroup(String type, String ageGroup);

    // Получить физиологические особенности по возрастной группе
    List<Material> findByTypeAndAgeGroupOrderByTitle(String type, String ageGroup);

    // Получить материалы по типу, этапу и возрастной группе
    List<Material> findByTypeAndStageAndAgeGroup(String type, String stage, String ageGroup);

    // Поиск материалов по названию
    List<Material> findByTitleContainingIgnoreCase(String title);

    // Получить все материалы определенного типа
    List<Material> findByTypeOrderByStageAscTitleAsc(String type);

    // Получить рекомендованные материалы для этапа (сортированные по приоритету)
    @Query("SELECT m FROM Material m WHERE m.type IN :types AND m.stage = :stage ORDER BY " +
            "CASE m.type " +
            "   WHEN 'GAME' THEN 1 " +
            "   WHEN 'EXERCISE' THEN 2 " +
            "   WHEN 'CAMPFIRE' THEN 3 " +
            "   ELSE 4 END")
    List<Material> findRecommendedForStage(
            @Param("types") List<String> types,
            @Param("stage") String stage);

    // Получить уникальные типы материалов
    @Query("SELECT DISTINCT m.type FROM Material m ORDER BY m.type")
    List<String> findDistinctTypes();
}