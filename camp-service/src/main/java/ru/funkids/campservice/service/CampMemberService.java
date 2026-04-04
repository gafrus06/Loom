package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.CampMemberAssignDto;
import ru.funkids.campservice.dto.CampMemberResponseDto;
import ru.funkids.campservice.dto.CampStaffSubRoleUpdateDto;
import ru.funkids.campservice.dto.SessionStaffAssignmentResponseDto;

import java.util.List;
import java.util.UUID;

public interface CampMemberService {

    /**
     * Назначить вожатого на лагерь (только ADMIN)
     */
    CampMemberResponseDto assignCounselor(CampMemberAssignDto dto, UUID adminId);

    /**
     * Вожатый выходит из лагеря сам
     */
    void leaveCamp(UUID userId);

    /**
     * ADMIN выгоняет вожатого из лагеря
     */
    void removeCounselor(UUID campId, UUID userId, UUID adminId);

    /**
     * Получить текущий лагерь вожатого
     */
    CampMemberResponseDto getMyCamp(UUID userId);

    /**
     * Получить всех вожатых лагеря
     */
    List<CampMemberResponseDto> getCampCounselors(UUID campId);

    /**
     * Проверить, прикреплён ли вожатый к лагерю
     */
    boolean isCounselorInAnyCamp(UUID userId);

    SessionStaffAssignmentResponseDto acceptSessionAssignment(UUID assignmentId, UUID userId);
    SessionStaffAssignmentResponseDto rejectSessionAssignment(UUID assignmentId, UUID userId);
    public void removeFromSession(UUID campId, UUID userId, UUID sessionId, UUID adminId);
    List<SessionStaffAssignmentResponseDto> getMySessionAssignments(UUID userId);
    List<SessionStaffAssignmentResponseDto> getSessionAssignments(UUID sessionId, UUID requesterId);
    CampMemberResponseDto updateStaffSubRole(UUID campId, UUID userId, CampStaffSubRoleUpdateDto dto, UUID adminId);
}
