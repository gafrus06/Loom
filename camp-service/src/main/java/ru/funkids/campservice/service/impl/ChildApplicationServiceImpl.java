package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.ChildApplicationCreateDto;
import ru.funkids.campservice.dto.ChildApplicationResponseDto;
import ru.funkids.campservice.dto.InviteCodeResponseDto;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.*;
import ru.funkids.campservice.service.CampAuthOutboxService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ChildApplicationServiceImpl {

    private final ChildApplicationRepository applicationRepository;
    private final CampInviteCodeRepository inviteCodeRepository;
    private final CampParentRepository campParentRepository;
    private final CampRepository campRepository;
    private final ChildRepository childRepository;
    private final DetachmentRepository detachmentRepository;
    private final CampAuthOutboxService campAuthOutboxService;

    public InviteCodeResponseDto generateInviteCode(UUID campId, UUID sessionId, UUID adminUserId) {
        campRepository.findById(campId)
                .orElseThrow(() -> new ResourceNotFoundException("Camp not found: " + campId));

        String code = "CAMP-" + randomCode();
        while (inviteCodeRepository.findByCodeAndActiveTrue(code).isPresent()) {
            code = "CAMP-" + randomCode();
        }

        CampInviteCode inviteCode = CampInviteCode.builder()
                .campId(campId)
                .sessionId(sessionId)
                .code(code)
                .createdBy(adminUserId)
                .active(true)
                .build();

        CampInviteCode saved = inviteCodeRepository.save(inviteCode);
        log.info("Generated invite code {} for camp {} session {}", code, campId, sessionId);
        return toInviteCodeDto(saved);
    }

    @Transactional(readOnly = true)
    public List<InviteCodeResponseDto> getInviteCodes(UUID campId) {
        return inviteCodeRepository.findByCampIdAndActiveTrue(campId)
                .stream().map(this::toInviteCodeDto).toList();
    }

    @Transactional(readOnly = true)
    public List<InviteCodeResponseDto> getInviteCodesBySession(UUID campId, UUID sessionId) {
        return inviteCodeRepository.findByCampIdAndSessionIdAndActiveTrue(campId, sessionId)
                .stream().map(this::toInviteCodeDto).toList();
    }

    public void deactivateCode(UUID codeId) {
        CampInviteCode code = inviteCodeRepository.findById(codeId)
                .orElseThrow(() -> new ResourceNotFoundException("Invite code not found: " + codeId));
        code.setActive(false);
        log.info("Deactivated invite code {}", codeId);
    }

    public UUID useInviteCode(String code, UUID parentUserId) {
        CampInviteCode inviteCode = inviteCodeRepository.findByCodeAndActiveTrue(code)
                .orElseThrow(() -> new IllegalArgumentException("Неверный или неактивный код приглашения"));

        UUID campId = inviteCode.getCampId();
        UUID sessionId = inviteCode.getSessionId();

        if (!campParentRepository.existsByCampIdAndSessionIdAndParentUserId(campId, sessionId, parentUserId)) {
            CampParent campParent = CampParent.builder()
                    .campId(campId)
                    .sessionId(sessionId)
                    .parentUserId(parentUserId)
                    .build();
            try {
                campParentRepository.save(campParent);
            } catch (DataIntegrityViolationException ex) {
                if (!campParentRepository.existsByCampIdAndSessionIdAndParentUserId(campId, sessionId, parentUserId)) {
                    throw ex;
                }
                log.info("Invite code {} was consumed concurrently by parent {} for session {}",
                        code, parentUserId, sessionId);
                return campId;
            }

            campAuthOutboxService.enqueueAssignRole(parentUserId, "ROLE_PARENT");
            log.info("Enqueued ROLE_PARENT assignment for user {}", parentUserId);
            log.info("Parent {} joined camp {} session {} via invite code", parentUserId, campId, sessionId);
        } else {
            log.info("Parent {} already linked to camp {} session {}", parentUserId, campId, sessionId);
        }

        return campId;
    }

    public ChildApplicationResponseDto createApplication(UUID campId, UUID parentUserId, ChildApplicationCreateDto dto) {
        if (!campParentRepository.existsByCampIdAndParentUserId(campId, parentUserId)) {
            throw new IllegalStateException("Родитель не привязан к этому лагерю");
        }

        ChildApplication application = ChildApplication.builder()
                .campId(campId)
                .parentUserId(parentUserId)
                .firstName(dto.firstName())
                .lastName(dto.lastName())
                .birthDate(dto.birthDate())
                .gender(dto.gender())
                .homeCity(dto.homeCity())
                .medicalNotes(dto.medicalNotes())
                .allergies(dto.allergies())
                .specialNeeds(dto.specialNeeds())
                .behavioralNotes(dto.behavioralNotes())
                .relation(dto.relation())
                .status(ApplicationStatus.PENDING)
                .build();

        ChildApplication saved = applicationRepository.save(application);
        log.info("Parent {} created application for {} {} in camp {}",
                parentUserId, dto.firstName(), dto.lastName(), campId);
        return toResponseDto(saved);
    }

    @Transactional(readOnly = true)
    public List<ChildApplicationResponseDto> getMyApplications(UUID campId, UUID parentUserId) {
        return applicationRepository.findByCampIdAndParentUserId(campId, parentUserId)
                .stream().map(this::toResponseDto).toList();
    }

    @Transactional(readOnly = true)
    public List<ChildApplicationResponseDto> getPendingApplications(UUID campId, String search) {
        List<ChildApplication> list = applicationRepository
                .findByCampIdAndStatusOrderByLastNameAscFirstNameAsc(campId, ApplicationStatus.PENDING);

        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            list = list.stream()
                    .filter(a -> (a.getLastName() + " " + a.getFirstName()).toLowerCase().contains(q)
                            || (a.getFirstName() + " " + a.getLastName()).toLowerCase().contains(q))
                    .toList();
        }

        return list.stream().map(this::toResponseDto).toList();
    }

    public ChildApplicationResponseDto confirmApplication(UUID applicationId, UUID detachmentId, UUID counselorUserId) {
        ChildApplication app = applicationRepository.findWithLockById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        if (app.getStatus() != ApplicationStatus.PENDING) {
            throw new IllegalStateException("Заявка уже обработана: " + app.getStatus());
        }

        Detachment detachment = detachmentRepository.findById(detachmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Detachment not found: " + detachmentId));

        Child child = Child.builder()
                .firstName(app.getFirstName())
                .lastName(app.getLastName())
                .birthDate(app.getBirthDate())
                .gender(app.getGender())
                .homeCity(app.getHomeCity())
                .medicalNotes(app.getMedicalNotes())
                .allergies(app.getAllergies())
                .specialNeeds(app.getSpecialNeeds())
                .behavioralNotes(app.getBehavioralNotes())
                .createdByUserId(counselorUserId)
                .parentVerified(true)
                .build();

        DetachmentMembership membership = DetachmentMembership.builder()
                .detachment(detachment)
                .child(child)
                .build();
        child.getMemberships().add(membership);

        ParentLinkId linkId = new ParentLinkId();
        linkId.setParentUserId(app.getParentUserId());
        ParentLink parentLink = new ParentLink();
        parentLink.setId(linkId);
        parentLink.setRelation(app.getRelation());
        parentLink.setChild(child);
        child.getParentLinks().add(parentLink);

        Child saved = childRepository.save(child);
        linkId.setChildId(saved.getId());

        app.setStatus(ApplicationStatus.CONFIRMED);
        app.setChildId(saved.getId());
        app.setConfirmedBy(counselorUserId);

        campAuthOutboxService.enqueueAssignRole(app.getParentUserId(), "ROLE_PARENT");
        log.info("Enqueued ROLE_PARENT assignment for user {}", app.getParentUserId());

        log.info("Application {} confirmed, child {} created in detachment {}",
                applicationId, saved.getId(), detachmentId);
        return toResponseDto(app);
    }

    public ChildApplicationResponseDto rejectApplication(UUID applicationId, UUID counselorUserId) {
        ChildApplication app = applicationRepository.findWithLockById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + applicationId));

        if (app.getStatus() != ApplicationStatus.PENDING) {
            throw new IllegalStateException("Заявка уже обработана: " + app.getStatus());
        }

        app.setStatus(ApplicationStatus.REJECTED);
        app.setConfirmedBy(counselorUserId);

        log.info("Application {} rejected by {}", applicationId, counselorUserId);
        return toResponseDto(app);
    }

    private String randomCode() {
        return UUID.randomUUID().toString()
                .replaceAll("-", "")
                .substring(0, 6)
                .toUpperCase();
    }

    private ChildApplicationResponseDto toResponseDto(ChildApplication a) {
        return new ChildApplicationResponseDto(
                a.getId(),
                a.getCampId(),
                a.getParentUserId(),
                null,
                a.getFirstName(),
                a.getLastName(),
                a.getBirthDate(),
                a.getGender(),
                a.getHomeCity(),
                a.getMedicalNotes(),
                a.getAllergies(),
                a.getSpecialNeeds(),
                a.getBehavioralNotes(),
                a.getRelation(),
                a.getStatus(),
                a.getChildId(),
                a.getCreatedAt()
        );
    }

    private InviteCodeResponseDto toInviteCodeDto(CampInviteCode c) {
        return new InviteCodeResponseDto(
                c.getId(), c.getCampId(), c.getSessionId(), c.getCode(), c.isActive(), c.getCreatedAt()
        );
    }
}
