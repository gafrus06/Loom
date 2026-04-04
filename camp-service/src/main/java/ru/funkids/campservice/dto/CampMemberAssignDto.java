package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.funkids.campservice.entity.StaffSubRole;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampMemberAssignDto {

    @NotNull
    private UUID campId;

    @NotNull
    private UUID userId;

    /**
     * Смены, к которым нужно привязать сотрудника.
     * Может содержать одну или несколько смен.
     */
    @NotEmpty(message = "Необходимо указать хотя бы одну смену")
    private List<UUID> sessionIds;

    /**
     * Контекстная роль сотрудника в рамках указанных смен.
     * По умолчанию обычный вожатый.
     */
    @Builder.Default
    private StaffSubRole subRole = StaffSubRole.COUNSELOR;
}
