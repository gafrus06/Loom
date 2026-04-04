package ru.funkids.campservice.service;

import ru.funkids.campservice.dto.SeniorCounselorNoticeCreateDto;
import ru.funkids.campservice.dto.SeniorCounselorNoticeResponseDto;
import ru.funkids.campservice.dto.SeniorCounselorNoticeUpdateDto;

import java.util.List;
import java.util.UUID;

public interface SeniorCounselorNoticeService {
    SeniorCounselorNoticeResponseDto create(SeniorCounselorNoticeCreateDto dto, UUID actorUserId);
    SeniorCounselorNoticeResponseDto update(UUID noticeId, SeniorCounselorNoticeUpdateDto dto, UUID actorUserId);
    void deactivate(UUID noticeId, UUID actorUserId);
    List<SeniorCounselorNoticeResponseDto> listForSession(UUID sessionId, UUID actorUserId);
    List<SeniorCounselorNoticeResponseDto> listForDetachment(UUID sessionId, UUID detachmentId, UUID actorUserId);
}
