package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.DetachmentJournalResponseDto;
import ru.funkids.campservice.dto.DetachmentJournalUpsertDto;
import ru.funkids.campservice.dto.ParentDetachmentJournalResponseDto;
import ru.funkids.campservice.entity.Detachment;
import ru.funkids.campservice.entity.DetachmentJournal;
import ru.funkids.campservice.repository.CounselorAssignmentRepository;
import ru.funkids.campservice.repository.DetachmentJournalRepository;
import ru.funkids.campservice.repository.DetachmentMembershipRepository;
import ru.funkids.campservice.repository.DetachmentRepository;
import ru.funkids.campservice.security.DetachmentSecurityService;
import ru.funkids.campservice.service.DetachmentJournalService;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DetachmentJournalServiceImpl implements DetachmentJournalService {

    private final DetachmentJournalRepository detachmentJournalRepository;
    private final DetachmentRepository detachmentRepository;
    private final CounselorAssignmentRepository counselorAssignmentRepository;
    private final DetachmentMembershipRepository detachmentMembershipRepository;
    private final DetachmentSecurityService detachmentSecurityService;

    @Override
    @Transactional
    public DetachmentJournalResponseDto upsert(UUID detachmentId, DetachmentJournalUpsertDto dto, UUID userId) {
        detachmentSecurityService.checkCanModifyDetachment(detachmentId, userId);

        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new IllegalArgumentException("Отряд не найден: " + detachmentId));

        DetachmentJournal journal = detachmentJournalRepository
                .findByDetachmentIdAndJournalDate(detachmentId, dto.getJournalDate())
                .orElseGet(() -> DetachmentJournal.builder()
                        .detachment(detachment)
                        .journalDate(dto.getJournalDate())
                        .createdByUserId(userId)
                        .build());

        journal.setUpdatedByUserId(userId);
        journal.setParticipationInfo(dto.getParticipationInfo());
        journal.setAdaptationInfo(dto.getAdaptationInfo());
        journal.setConflictInfo(dto.getConflictInfo());
        journal.setSuccessInfo(dto.getSuccessInfo());
        journal.setActivityLevel(dto.getActivityLevel());
        journal.setNotes(dto.getNotes());
        journal.setVisibleForParentsVersion(dto.getVisibleForParentsVersion());

        return toInternalDto(detachmentJournalRepository.save(journal));
    }

    @Override
    public DetachmentJournalResponseDto getInternal(UUID detachmentId, LocalDate journalDate, UUID userId) {
        detachmentSecurityService.checkCanViewDetachment(detachmentId, userId);
        return detachmentJournalRepository.findByDetachmentIdAndJournalDate(detachmentId, journalDate)
                .map(this::toInternalDto)
                .orElseThrow(() -> new IllegalArgumentException("Журнал не найден на дату: " + journalDate));
    }

    @Override
    public List<DetachmentJournalResponseDto> listInternal(UUID detachmentId, UUID userId) {
        detachmentSecurityService.checkCanViewDetachment(detachmentId, userId);
        return detachmentJournalRepository.findByDetachmentIdOrderByJournalDateDesc(detachmentId)
                .stream()
                .map(this::toInternalDto)
                .toList();
    }

    @Override
    public ParentDetachmentJournalResponseDto getParentView(UUID detachmentId, LocalDate journalDate, UUID userId) {
        detachmentSecurityService.checkCanViewDetachment(detachmentId, userId);
        return detachmentJournalRepository.findByDetachmentIdAndJournalDate(detachmentId, journalDate)
                .map(this::toParentDto)
                .orElseThrow(() -> new IllegalArgumentException("Журнал не найден на дату: " + journalDate));
    }

    @Override
    public List<ParentDetachmentJournalResponseDto> listParentView(UUID detachmentId, UUID userId) {
        detachmentSecurityService.checkCanViewDetachment(detachmentId, userId);
        return detachmentJournalRepository.findByDetachmentIdOrderByJournalDateDesc(detachmentId)
                .stream()
                .map(this::toParentDto)
                .toList();
    }

    private DetachmentJournalResponseDto toInternalDto(DetachmentJournal journal) {
        return DetachmentJournalResponseDto.builder()
                .id(journal.getId())
                .detachmentId(journal.getDetachment().getId())
                .journalDate(journal.getJournalDate())
                .createdByUserId(journal.getCreatedByUserId())
                .updatedByUserId(journal.getUpdatedByUserId())
                .participationInfo(journal.getParticipationInfo())
                .adaptationInfo(journal.getAdaptationInfo())
                .conflictInfo(journal.getConflictInfo())
                .successInfo(journal.getSuccessInfo())
                .activityLevel(journal.getActivityLevel())
                .notes(journal.getNotes())
                .visibleForParentsVersion(journal.getVisibleForParentsVersion())
                .createdAt(journal.getCreatedAt())
                .updatedAt(journal.getUpdatedAt())
                .build();
    }

    private ParentDetachmentJournalResponseDto toParentDto(DetachmentJournal journal) {
        Detachment detachment = journal.getDetachment();
        int childrenCount = detachmentMembershipRepository.findActiveByDetachmentId(detachment.getId()).size();

        return ParentDetachmentJournalResponseDto.builder()
                .id(journal.getId())
                .campId(detachment.getSession().getCamp().getId())
                .sessionId(detachment.getSession().getId())
                .detachmentId(detachment.getId())
                .detachmentName(detachment.getName())
                .detachmentStage(detachment.getStage())
                .journalDate(journal.getJournalDate())
                .activityLevel(journal.getActivityLevel())
                .visibleForParentsVersion(journal.getVisibleForParentsVersion())
                .childrenCount(childrenCount)
                .updatedAt(journal.getUpdatedAt())
                .build();
    }
}
