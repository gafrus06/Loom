package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.MembershipAddDto;
import ru.funkids.campservice.dto.MembershipCloseDto;
import ru.funkids.campservice.dto.MembershipResponseDto;
import ru.funkids.campservice.entity.Child;
import ru.funkids.campservice.entity.Detachment;
import ru.funkids.campservice.entity.DetachmentMembership;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.ChildRepository;
import ru.funkids.campservice.repository.DetachmentMembershipRepository;
import ru.funkids.campservice.repository.DetachmentRepository;
import ru.funkids.campservice.service.AuditEventService;
import ru.funkids.campservice.service.MembershipService;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MembershipServiceImpl implements MembershipService {

    private final DetachmentMembershipRepository membershipRepository;
    private final DetachmentRepository detachmentRepository;
    private final ChildRepository childRepository;
    private final AuditEventService auditEventService;

    @Override
    public MembershipResponseDto add(MembershipAddDto dto, UUID actorUserId) {
        log.info("Adding child {} to detachment {} by user {}",
                dto.getChildId(), dto.getDetachmentId(), actorUserId);

        Detachment detachment = detachmentRepository.findById(dto.getDetachmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Detachment not found: " + dto.getDetachmentId()));

        Child child = childRepository.findById(dto.getChildId())
                .orElseThrow(() -> new ResourceNotFoundException("Child not found: " + dto.getChildId()));

        boolean exists = membershipRepository.findActiveByDetachmentId(dto.getDetachmentId())
                .stream()
                .anyMatch(m -> m.getChild().getId().equals(dto.getChildId()));

        if (exists) {
            throw new IllegalArgumentException("Child already active in this detachment");
        }

        DetachmentMembership membership = DetachmentMembership.builder()
                .detachment(detachment)
                .child(child)
                .notes(dto.getNotes())
                .build();

        DetachmentMembership saved = membershipRepository.save(membership);

        UUID campId = detachment.getSession().getCamp().getId();

        auditEventService.log(
                campId,
                "CHILD_ADDED_TO_DETACHMENT",
                "Ребёнок " + child.getFirstName() + " " + child.getLastName()
                        + " добавлен в отряд «" + detachment.getName() + "»",
                "DETACHMENT",
                detachment.getId(),
                actorUserId,
                Map.of("childId", child.getId().toString(),
                        "childName", child.getFirstName() + " " + child.getLastName())
        );

        log.info("Child added to detachment, membership id: {}", saved.getId());
        return mapToDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MembershipResponseDto> listByChild(UUID childId) {
        log.info("Listing memberships for child: {}", childId);
        return membershipRepository.findByChildId(childId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public MembershipResponseDto getActiveMembership(UUID childId) {
        log.info("Getting active membership for child: {}", childId);
        return membershipRepository.findByChildIdAndLeftAtIsNull(childId)
                .map(this::mapToDto)
                .orElse(null);
    }

    @Override
    public MembershipResponseDto close(MembershipCloseDto dto, UUID actorUserId) {
        log.info("Closing membership {} by user {}", dto.getMembershipId(), actorUserId);

        DetachmentMembership membership = membershipRepository.findById(dto.getMembershipId())
                .orElseThrow(() -> new ResourceNotFoundException("Membership not found: " + dto.getMembershipId()));

        if (membership.getLeftAt() != null) {
            return mapToDto(membership); // уже закрыто — idempotent
        }

        if (dto.getNotes() != null) {
            membership.setNotes(dto.getNotes());
        }
        membership.setLeftAt(OffsetDateTime.now());

        DetachmentMembership updated = membershipRepository.save(membership);

        UUID campId = membership.getDetachment().getSession().getCamp().getId();
        Child child = membership.getChild();
        Detachment detachment = membership.getDetachment();

        auditEventService.log(
                campId,
                "CHILD_REMOVED_FROM_DETACHMENT",
                "Ребёнок " + child.getFirstName() + " " + child.getLastName()
                        + " выбыл из отряда «" + detachment.getName() + "»",
                "DETACHMENT",
                detachment.getId(),
                actorUserId,
                Map.of("childId", child.getId().toString(),
                        "childName", child.getFirstName() + " " + child.getLastName())
        );

        log.info("Membership closed: {}", dto.getMembershipId());
        return mapToDto(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MembershipResponseDto> listByDetachment(UUID detachmentId) {
        return membershipRepository.findByDetachmentId(detachmentId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private MembershipResponseDto mapToDto(DetachmentMembership m) {
        return MembershipResponseDto.builder()
                .id(m.getId())
                .detachmentId(m.getDetachment().getId())
                .childId(m.getChild().getId())
                .joinedAt(m.getJoinedAt())
                .leftAt(m.getLeftAt())
                .notes(m.getNotes())
                .active(m.isActive())
                .build();
    }
}