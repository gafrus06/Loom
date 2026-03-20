package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.SessionCreateDto;
import ru.funkids.campservice.dto.SessionResponseDto;
import ru.funkids.campservice.dto.SessionUpdateDto;
import ru.funkids.campservice.dto.SessionWithRoleDto;

import java.util.List;
import java.util.UUID;

public interface SessionService {
    SessionResponseDto create(SessionCreateDto dto);
    SessionResponseDto update(UUID id, SessionUpdateDto dto);
    SessionResponseDto get(UUID id);
    List<SessionResponseDto> listByCamp(UUID campId);
    void delete(UUID id);

    /**
     * Получить все доступные смены пользователя с учётом ролей:
     * - ADMIN (OWNER): смены своих лагерей
     * - COUNSELOR: смены лагерей где назначен вожатым
     * - ADMIN+COUNSELOR: все смены
     *
     * @param userId ID пользователя
     * @return список смен с информацией о типе доступа
     */
    List<SessionWithRoleDto> listMyAccessibleSessions(UUID userId);
}