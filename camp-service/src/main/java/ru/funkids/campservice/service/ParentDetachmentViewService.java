package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.ParentDetachmentViewDto;

import java.util.UUID;

public interface ParentDetachmentViewService {
    ParentDetachmentViewDto getDetachmentView(UUID detachmentId, UUID parentUserId);
}
