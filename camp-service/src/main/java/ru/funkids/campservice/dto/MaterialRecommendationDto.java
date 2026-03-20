package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialRecommendationDto {
    private UUID id;
    private String title;
    private String type; // game, campfire, exercise
    private String stage;
    private String reason; // почему рекомендуется
    private Integer priority; // приоритет рекомендации
}