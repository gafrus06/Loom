package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditEventResponseDto {

    private UUID id;

    /** Лагерь, в котором произошло событие — основной ключ фильтрации */
    private UUID campId;

    private UUID actorUserId;

    /** Машиночитаемый код: DETACHMENT_STAGE_CHANGED, COUNSELOR_ASSIGNED и т.д. */
    private String action;

    /**
     * Человекочитаемое описание без UUID — для отображения в UI аналитики.
     * Пример: "Отряд «Орлята» перешёл на этап: Деловой"
     */
    private String description;

    private String entityType;
    private UUID entityId;

    private OffsetDateTime timestamp;

    /** Технические детали в JSON (старые/новые значения, доп. контекст) */
    private Map<String, Object> details;
}