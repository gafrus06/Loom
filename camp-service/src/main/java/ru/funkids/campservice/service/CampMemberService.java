package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.CampMemberAssignDto;
import ru.funkids.campservice.dto.CampMemberResponseDto;

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
}