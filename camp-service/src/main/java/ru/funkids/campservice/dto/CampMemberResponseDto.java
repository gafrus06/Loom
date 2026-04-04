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
     * Для обратной совместимости оставляем старое поле.
     * В новой логике фронту лучше использовать sessionAssignments.
     */
    private List<UUID> sessionIds;

    /**
     * Полная информация о назначениях сотрудника на смены.
     */
    private List<SessionStaffAssignmentResponseDto> sessionAssignments;
}
