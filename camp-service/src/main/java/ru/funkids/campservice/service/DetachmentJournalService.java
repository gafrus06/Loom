package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.DetachmentJournalResponseDto;
import ru.funkids.campservice.dto.DetachmentJournalUpsertDto;
import ru.funkids.campservice.dto.ParentDetachmentJournalResponseDto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface DetachmentJournalService {

    DetachmentJournalResponseDto upsert(UUID detachmentId, DetachmentJournalUpsertDto dto, UUID userId);

    DetachmentJournalResponseDto getInternal(UUID detachmentId, LocalDate journalDate, UUID userId);

    List<DetachmentJournalResponseDto> listInternal(UUID detachmentId, UUID userId);

    ParentDetachmentJournalResponseDto getParentView(UUID detachmentId, LocalDate journalDate, UUID userId);

    List<ParentDetachmentJournalResponseDto> listParentView(UUID detachmentId, UUID userId);
}
