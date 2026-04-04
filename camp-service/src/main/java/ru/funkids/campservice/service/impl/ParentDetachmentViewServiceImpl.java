package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.entity.Child;
import ru.funkids.campservice.entity.CounselorAssignment;
import ru.funkids.campservice.entity.Detachment;
import ru.funkids.campservice.entity.ParentLink;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.CampMemberSessionRepository;
import ru.funkids.campservice.repository.CounselorAssignmentRepository;
import ru.funkids.campservice.repository.DetachmentJournalRepository;
import ru.funkids.campservice.repository.DetachmentMembershipRepository;
import ru.funkids.campservice.repository.DetachmentRepository;
import ru.funkids.campservice.repository.ParentLinkRepository;
import ru.funkids.campservice.security.DetachmentSecurityService;
import ru.funkids.campservice.service.ParentDetachmentViewService;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ParentDetachmentViewServiceImpl implements ParentDetachmentViewService {

    private final DetachmentRepository detachmentRepository;
    private final DetachmentMembershipRepository detachmentMembershipRepository;
    private final CounselorAssignmentRepository counselorAssignmentRepository;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final ParentLinkRepository parentLinkRepository;
    private final DetachmentJournalRepository detachmentJournalRepository;
    private final DetachmentSecurityService detachmentSecurityService;

    @Override
    public ParentDetachmentViewDto getDetachmentView(UUID detachmentId, UUID parentUserId) {
        if (!detachmentSecurityService.isParentHasChildInDetachment(detachmentId, parentUserId)) {
            throw new IllegalStateException("Нет доступа к странице этого отряда");
        }

        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Отряд не найден: " + detachmentId));

        Map<UUID, String> relationByChildId = parentLinkRepository.findByParentUserId(parentUserId).stream()
                .collect(Collectors.toMap(
                        link -> link.getId().getChildId(),
                        ParentLink::getRelation,
                        (a, b) -> a
                ));

        List<ParentDetachmentChildSummaryDto> children = detachmentMembershipRepository.findActiveByDetachmentId(detachmentId).stream()
                .map(membership -> {
                    Child child = membership.getChild();
                    return ParentDetachmentChildSummaryDto.builder()
                            .childId(child.getId())
                            .firstName(child.getFirstName())
                            .lastName(child.getLastName())
                            .birthDate(child.getBirthDate())
                            .gender(child.getGender())
                            .belongsToCurrentParent(relationByChildId.containsKey(child.getId()))
                            .relation(relationByChildId.get(child.getId()))
                            .build();
                })
                .toList();
        int totalChildren = children.size();
        List<ParentDetachmentChildSummaryDto> safeChildren = children.stream()
                .filter(ParentDetachmentChildSummaryDto::isBelongsToCurrentParent)
                .toList();

        Set<UUID> myChildIds = relationByChildId.keySet();
        List<ParentOwnChildDetailsDto> myChildren = detachmentMembershipRepository.findActiveByDetachmentId(detachmentId).stream()
                .map(m -> m.getChild())
                .filter(child -> myChildIds.contains(child.getId()))
                .map(child -> ParentOwnChildDetailsDto.builder()
                        .childId(child.getId())
                        .firstName(child.getFirstName())
                        .lastName(child.getLastName())
                        .birthDate(child.getBirthDate())
                        .gender(child.getGender())
                        .homeCity(child.getHomeCity())
                        .allergies(child.getAllergies())
                        .specialNeeds(child.getSpecialNeeds())
                        .behavioralNotes(child.getBehavioralNotes())
                        .build())
                .toList();

        boolean hasSenior = campMemberSessionRepository.findBySessionIdAndAssignmentStatusAndActiveTrue(
                        detachment.getSession().getId(), ru.funkids.campservice.entity.AssignmentStatus.ACCEPTED)
                .stream()
                .anyMatch(cms -> cms.getSubRole() == ru.funkids.campservice.entity.StaffSubRole.SENIOR_COUNSELOR);

        List<ParentDetachmentCounselorSummaryDto> counselors = counselorAssignmentRepository.findByDetachmentIdAndActiveTrue(detachmentId).stream()
                .map(this::toCounselorDto)
                .toList();

        if (hasSenior && counselors.stream().noneMatch(ParentDetachmentCounselorSummaryDto::isSeniorCounselor)) {
            // parent-facing страница может показывать, что у смены есть старший вожатый,
            // даже если он не закреплен на отряд напрямую.
            counselors = new ArrayList<>(counselors);
            counselors.add(ParentDetachmentCounselorSummaryDto.builder()
                    .userId(null)
                    .detachmentRole(null)
                    .seniorCounselor(true)
                    .build());
        }

        List<ParentDetachmentJournalResponseDto> journals = detachmentJournalRepository.findByDetachmentIdOrderByJournalDateDesc(detachmentId).stream()
                .map(j -> ParentDetachmentJournalResponseDto.builder()
                        .id(j.getId())
                        .detachmentId(detachmentId)
                        .journalDate(j.getJournalDate())
                        .activityLevel(j.getActivityLevel())
                        .visibleForParentsVersion(j.getVisibleForParentsVersion())
                        .updatedAt(j.getUpdatedAt())
                        .build())
                .toList();

        return ParentDetachmentViewDto.builder()
                .detachmentId(detachment.getId())
                .detachmentName(detachment.getName())
                .ageGroup(detachment.getAgeGroup())
                .stage(detachment.getStage())
                .sessionId(detachment.getSession().getId())
                .sessionTitle(detachment.getSession().getTitle())
                .campId(detachment.getSession().getCamp().getId())
                .campName(detachment.getSession().getCamp().getName())
                .counselors(counselors)
                .children(safeChildren)
                .myChildren(myChildren)
                .totalChildren(totalChildren)
                .journals(journals)
                .build();
    }

    private ParentDetachmentCounselorSummaryDto toCounselorDto(CounselorAssignment assignment) {
        return ParentDetachmentCounselorSummaryDto.builder()
                .userId(assignment.getUserId())
                .detachmentRole(assignment.getRoleInDetachment())
                .seniorCounselor(false)
                .build();
    }
}
