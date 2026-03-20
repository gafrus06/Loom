package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.CounselorAssignDto;
import ru.funkids.campservice.dto.CounselorAssignmentResponseDto;
import ru.funkids.campservice.dto.CounselorUnassignDto;

import java.util.List;
import java.util.UUID;

public interface CounselorAssignmentService {
    List<CounselorAssignmentResponseDto> getActiveAssignmentsByUser(UUID userId);
    CounselorAssignmentResponseDto assign(CounselorAssignDto dto, UUID actorUserId);
    CounselorAssignmentResponseDto unassign(CounselorUnassignDto dto, UUID actorUserId);
    List<CounselorAssignmentResponseDto> listActiveByDetachment(UUID detachmentId);
}
