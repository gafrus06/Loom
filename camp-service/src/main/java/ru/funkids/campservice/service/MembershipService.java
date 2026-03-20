package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.MembershipAddDto;
import ru.funkids.campservice.dto.MembershipCloseDto;
import ru.funkids.campservice.dto.MembershipResponseDto;

import java.util.List;
import java.util.UUID;

public interface MembershipService {
    MembershipResponseDto add(MembershipAddDto dto, UUID actorUserId);
    MembershipResponseDto close(MembershipCloseDto dto, UUID actorUserId);
    List<MembershipResponseDto> listByDetachment(UUID detachmentId);
    List<MembershipResponseDto> listByChild(UUID childId);

    MembershipResponseDto getActiveMembership(UUID childId);
}
