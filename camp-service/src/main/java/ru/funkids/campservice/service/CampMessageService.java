package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.CampMessageCreateDto;
import ru.funkids.campservice.dto.CampMessageResponseDto;

import java.util.List;
import java.util.UUID;

public interface CampMessageService {
    CampMessageResponseDto create(CampMessageCreateDto dto, UUID actorUserId);
    List<CampMessageResponseDto> listByDetachment(UUID detachmentId, UUID actorUserId);
    List<CampMessageResponseDto> listInbox(UUID actorUserId);
    void markRead(UUID messageId, UUID actorUserId);
}
