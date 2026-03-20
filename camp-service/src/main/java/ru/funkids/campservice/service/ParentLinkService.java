package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.ParentLinkCreateDto;
import ru.funkids.campservice.dto.ParentLinkResponseDto;

import java.util.List;
import java.util.UUID;

public interface ParentLinkService {
    ParentLinkResponseDto link(ParentLinkCreateDto dto);
    void unlink(UUID childId, UUID parentUserId);
    List<ParentLinkResponseDto> listByChild(UUID childId);
    List<ParentLinkResponseDto> listByParent(UUID parentUserId);
}