package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO отряда с информацией о роли пользователя
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DetachmentWithRoleDto {

    private UUID id;
    private String name;
    private String description;
    private UUID sessionId;
    private String sessionName;
    private UUID campId;
    private String campName;
    // НЕТ creatorId - его нет в Entity

    /**
     * Тип доступа к отряду:
     * - "ASSIGNED_PARTNER" - назначен напарником (через CounselorAssignment)
     * - "CAMP_OWNER" - владелец лагеря
     * - "ASSIGNED_AND_CAMP_OWNER" - оба
     */
    private String accessType;

    /**
     * Является ли создателем отряда
     * (пока не используется, т.к. нет creatorId в Entity)
     */
    private boolean creator;

    /**
     * Является ли назначенным напарником
     */
    private boolean assignedPartner;

    /**
     * Является ли владельцем лагеря
     */
    private boolean campOwner;
}