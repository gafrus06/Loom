package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.ShiftTaskCompletionResponseDto;
import ru.funkids.campservice.dto.ShiftTaskCompletionUpsertDto;
import ru.funkids.campservice.dto.ShiftTaskCreateDto;
import ru.funkids.campservice.dto.ShiftTaskResponseDto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ShiftTaskService {
    ShiftTaskResponseDto create(ShiftTaskCreateDto dto, UUID actorUserId);
    ShiftTaskResponseDto getById(UUID taskId, UUID actorUserId);
    List<ShiftTaskResponseDto> listBySession(UUID sessionId, UUID actorUserId);
    List<ShiftTaskResponseDto> listForCurrentDay(UUID sessionId, UUID actorUserId, LocalDate currentDate, UUID detachmentId);
    ShiftTaskCompletionResponseDto upsertCompletion(ShiftTaskCompletionUpsertDto dto, UUID actorUserId);
}
