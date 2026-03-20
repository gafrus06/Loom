package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.funkids.campservice.entity.CampRole;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampMemberResponseDto {

    private UUID id;
    private UUID campId;
    private String campName;
    private UUID userId;
    private CampRole role;
    private boolean active;

    /**
     * Смены, к которым привязан вожатый.
     * Для OWNER всегда пустой список — доступ по роли.
     */
    private List<UUID> sessionIds;
}