package ru.funkids.campservice.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import ru.funkids.campservice.dto.AuditEventResponseDto;

public interface AuditEventService {

    /**
     * Записывает событие аудита с человекочитаемым описанием.
     *
     * @param campId      UUID лагеря (для фильтрации по лагерю в аналитике)
     * @param action      машиночитаемый код: DETACHMENT_STAGE_CHANGED, COUNSELOR_ASSIGNED и т.д.
     * @param description человекочитаемое описание без UUID, например:
     *                    "Отряд «Орлята» перешёл на этап: Деловой"
     * @param entityType  тип сущности: DETACHMENT, SESSION, CHILD, CAMP_MEMBER и т.д.
     * @param entityId    UUID затронутой сущности
     * @param actorUserId UUID пользователя, совершившего действие
     * @param details     дополнительные данные в JSON (может быть null)
     */
    void log(UUID campId,
             String action,
             String description,
             String entityType,
             UUID entityId,
             UUID actorUserId,
             Map<String, Object> details);

    /** Последние N событий по типу и ID сущности */
    List<AuditEventResponseDto> recentByEntity(String entityType, UUID entityId, int limit);

    /** Последние N событий по конкретному актору */
    List<AuditEventResponseDto> recentByActor(UUID actorUserId, int limit);

    /** Последние N событий для конкретного лагеря (основной метод аналитики) */
    List<AuditEventResponseDto> recentByCamp(UUID campId, int limit);

    /** Последние N событий по коду действия в лагере */
    List<AuditEventResponseDto> recentByCampAndAction(UUID campId, String action, int limit);
}