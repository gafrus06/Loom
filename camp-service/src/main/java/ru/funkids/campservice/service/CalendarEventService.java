package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.CalendarEventCreateDto;
import ru.funkids.campservice.dto.CalendarEventResponseDto;
import ru.funkids.campservice.dto.CalendarEventUpdateDto;

import java.util.List;
import java.util.UUID;

public interface CalendarEventService {
    CalendarEventResponseDto create(CalendarEventCreateDto dto, UUID actorUserId);
    CalendarEventResponseDto update(UUID eventId, CalendarEventUpdateDto dto, UUID actorUserId);
    void delete(UUID eventId, UUID actorUserId);
    List<CalendarEventResponseDto> listBySession(UUID sessionId, UUID actorUserId);
}
