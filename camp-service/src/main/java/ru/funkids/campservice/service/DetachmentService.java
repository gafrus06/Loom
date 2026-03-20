package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.DetachmentCreateDto;
import ru.funkids.campservice.dto.DetachmentResponseDto;
import ru.funkids.campservice.dto.DetachmentUpdateDto;
import ru.funkids.campservice.dto.DetachmentWithRoleDto;
import ru.funkids.campservice.entity.DetachmentStage;

import java.util.List;
import java.util.UUID;

public interface DetachmentService {
    DetachmentResponseDto create(DetachmentCreateDto dto, UUID creatorId);
    DetachmentResponseDto update(UUID id, DetachmentUpdateDto dto);
    DetachmentResponseDto get(UUID id);
    List<DetachmentResponseDto> listBySession(UUID sessionId);
    void delete(UUID id);
    DetachmentResponseDto updateStage(UUID detachmentId, DetachmentStage stage, UUID userId);
    /**
     * Получить все доступные отряды пользователя с учётом ролей:
     * - ADMIN (OWNER): все отряды своих лагерей - помечены "Лагерь: ..."
     * - COUNSELOR (creator): созданные отряды - помечены "Мой отряд"
     * - COUNSELOR (assigned): назначенные отряды - помечены "Назначен напарником"
     *
     * @param userId ID пользователя
     * @return список отрядов с информацией о типе доступа
     */
    List<DetachmentWithRoleDto> listMyAccessibleDetachments(UUID userId);
}