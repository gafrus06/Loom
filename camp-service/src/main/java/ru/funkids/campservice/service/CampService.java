package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.CampCreateDto;
import ru.funkids.campservice.dto.CampResponseDto;
import ru.funkids.campservice.dto.CampUpdateDto;
import ru.funkids.campservice.dto.CampWithRoleDto;

import java.util.List;
import java.util.UUID;

public interface CampService {
    CampResponseDto create(CampCreateDto dto, UUID ownerId);
    CampResponseDto update(UUID id, CampUpdateDto dto);
    CampResponseDto get(UUID id);
    List<CampResponseDto> listByOwner(UUID ownerId);
    List<CampResponseDto> listAll();
    void delete(UUID id);

    /**
     * Получить все доступные лагеря пользователя с учётом ролей:
     * - ADMIN (OWNER): созданные лагеря - помечены "Мой лагерь"
     * - COUNSELOR: назначенные лагеря - помечены "Назначен вожатым"
     * - ADMIN+COUNSELOR: оба типа с соответствующими метками
     * - PARENT: лагеря где находятся их дети - помечены "Ребёнок здесь"
     *
     * @param userId ID пользователя
     * @param isParent true если пользователь - родитель
     * @return список лагерей с информацией о типе доступа
     */
    List<CampWithRoleDto> listMyAccessibleCamps(UUID userId, boolean isParent);
}