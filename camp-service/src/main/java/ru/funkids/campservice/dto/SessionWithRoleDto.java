package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

/**
 * DTO смены с информацией о роли пользователя
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionWithRoleDto {

    private UUID id;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    private UUID campId;
    private String campName;

    /**
     * Тип доступа к смене:
     * - "CAMP_OWNER" - владелец лагеря
     * - "ASSIGNED_COUNSELOR" - назначенный вожатый
     * - "BOTH" - и то и другое
     */
    private String accessType;

    /**
     * Является ли владельцем лагеря этой смены
     * Lombok генерирует: isCampOwner() и setCampOwner(boolean)
     */
    private boolean campOwner;

    /**
     * Является ли назначенным вожатым в этом лагере
     * Lombok генерирует: isAssignedCounselor() и setAssignedCounselor(boolean)
     */
    private boolean assignedCounselor;
}