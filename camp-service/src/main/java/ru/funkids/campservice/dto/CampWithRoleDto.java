package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampWithRoleDto {

    private UUID id;
    private String name;
    private String location;
    private String description;
    private UUID photoFileId;
    private UUID ownerId;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    /**
     * Тип доступа: OWNER, COUNSELOR, OWNER_AND_COUNSELOR, PARENT
     */
    private String accessType;

    private boolean owner;
    private boolean assignedCounselor;

    /**
     * Для PARENT: список UUID смен, к которым привязан родитель в этом лагере.
     * Если у родителя двое детей в разных сменах одного лагеря — оба sessionId будут здесь.
     * Для OWNER и COUNSELOR поле не используется (null или пусто).
     */
    private List<UUID> sessionIds;
}
