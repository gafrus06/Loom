package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.ChildCreateDto;
import ru.funkids.campservice.dto.ChildResponseDto;
import ru.funkids.campservice.dto.ChildUpdateDto;

import java.util.UUID;

public interface ChildService {
    ChildResponseDto create(ChildCreateDto dto, UUID creatorUserId);
    ChildResponseDto update(UUID id, ChildUpdateDto dto, UUID updaterUserId);
    ChildResponseDto get(UUID id);
    void delete(UUID id);
}
