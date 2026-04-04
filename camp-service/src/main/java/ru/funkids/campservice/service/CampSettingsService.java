package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.CampSettingsResponseDto;
import ru.funkids.campservice.dto.CampSettingsUpsertDto;
import ru.funkids.campservice.dto.CampPostingAccessDto;

import java.util.UUID;

public interface CampSettingsService {
    CampSettingsResponseDto upsert(CampSettingsUpsertDto dto, UUID actorUserId);
    CampSettingsResponseDto getByCampId(UUID campId);
    CampPostingAccessDto getPostingAccess(UUID campId, UUID actorUserId);
}
