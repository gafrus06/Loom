package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavoriteDto {

    @NotNull(message = "ID материала обязателен")
    private UUID materialId;

    @NotBlank(message = "Тип материала обязателен")
    private String materialType; // GAME, CAMPFIRE, EXERCISE
}