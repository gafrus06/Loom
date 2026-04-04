package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.CampPostingAccessDto;
import ru.funkids.campservice.dto.CampSettingsResponseDto;
import ru.funkids.campservice.dto.CampSettingsUpsertDto;
import ru.funkids.campservice.entity.Camp;
import ru.funkids.campservice.entity.AssignmentStatus;
import ru.funkids.campservice.entity.CampSettings;
import ru.funkids.campservice.entity.PostingMode;
import ru.funkids.campservice.entity.StaffSubRole;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.CampMemberRepository;
import ru.funkids.campservice.repository.CampMemberSessionRepository;
import ru.funkids.campservice.repository.CampRepository;
import ru.funkids.campservice.repository.CampSettingsRepository;
import ru.funkids.campservice.entity.CampRole;
import ru.funkids.campservice.service.AuditEventService;
import ru.funkids.campservice.service.CampSettingsService;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CampSettingsServiceImpl implements CampSettingsService {

    private final CampSettingsRepository campSettingsRepository;
    private final CampRepository campRepository;
    private final CampMemberRepository campMemberRepository;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final AuditEventService auditEventService;

    @Override
    public CampSettingsResponseDto upsert(CampSettingsUpsertDto dto, UUID actorUserId) {
        checkCampAdmin(dto.getCampId(), actorUserId);

        Camp camp = campRepository.findById(dto.getCampId())
                .orElseThrow(() -> new ResourceNotFoundException("Лагерь не найден: " + dto.getCampId()));

        CampSettings settings = campSettingsRepository.findByCampId(dto.getCampId())
                .orElse(CampSettings.builder().camp(camp).build());

        settings.setPostingMode(dto.getPostingMode());
        settings.setCalendarEnabled(dto.isCalendarEnabled());
        settings.setCalendarVisibleForParents(dto.isCalendarVisibleForParents());

        CampSettings saved = campSettingsRepository.save(settings);
        auditEventService.log(
                dto.getCampId(),
                "CAMP_SETTINGS_UPDATED",
                "Обновлены настройки лагеря",
                "CAMP_SETTINGS",
                saved.getId(),
                actorUserId,
                Map.of(
                        "postingMode", saved.getPostingMode().name(),
                        "calendarEnabled", saved.isCalendarEnabled(),
                        "calendarVisibleForParents", saved.isCalendarVisibleForParents()
                )
        );
        return map(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public CampSettingsResponseDto getByCampId(UUID campId) {
        CampSettings settings = campSettingsRepository.findByCampId(campId)
                .orElseGet(() -> {
                    Camp camp = campRepository.findById(campId)
                            .orElseThrow(() -> new ResourceNotFoundException("Лагерь не найден: " + campId));
                    return CampSettings.builder().camp(camp).build();
                });
        return map(settings);
    }

    @Override
    @Transactional(readOnly = true)
    public CampPostingAccessDto getPostingAccess(UUID campId, UUID actorUserId) {
        CampSettingsResponseDto settings = getByCampId(campId);
        boolean campOwner = campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(campId, actorUserId, CampRole.OWNER);

        var acceptedAssignments = campMemberSessionRepository
                .findByCampMemberUserIdAndAssignmentStatusAndActiveTrue(actorUserId, AssignmentStatus.ACCEPTED)
                .stream()
                .filter(cms -> cms.getCampMember().getCamp().getId().equals(campId))
                .toList();

        boolean acceptedStaff = !acceptedAssignments.isEmpty();
        boolean seniorCounselor = acceptedAssignments.stream()
                .anyMatch(cms -> cms.getSubRole() == StaffSubRole.SENIOR_COUNSELOR);

        PostingMode postingMode = settings.getPostingMode();
        boolean canModeratePosts = campOwner || seniorCounselor;
        boolean canPostWithoutModeration = switch (postingMode) {
            case FREE -> campOwner || acceptedStaff;
            case MODERATED -> campOwner || seniorCounselor;
            case ONLY_SENIOR_AND_ADMIN -> campOwner || seniorCounselor;
            case ONLY_ADMIN -> campOwner;
        };

        return CampPostingAccessDto.builder()
                .campId(campId)
                .postingMode(postingMode.name())
                .campOwner(campOwner)
                .acceptedStaff(acceptedStaff)
                .seniorCounselor(seniorCounselor)
                .canPostWithoutModeration(canPostWithoutModeration)
                .canModeratePosts(canModeratePosts)
                .build();
    }

    private void checkCampAdmin(UUID campId, UUID actorUserId) {
        boolean isAdmin = campMemberRepository.existsByCampIdAndUserIdAndRoleAndActiveTrue(campId, actorUserId, CampRole.OWNER);
        if (!isAdmin) {
            throw new IllegalStateException("Только администратор лагеря может менять настройки лагеря");
        }
    }

    private CampSettingsResponseDto map(CampSettings settings) {
        return CampSettingsResponseDto.builder()
                .id(settings.getId())
                .campId(settings.getCamp().getId())
                .campName(settings.getCamp().getName())
                .postingMode(settings.getPostingMode())
                .calendarEnabled(settings.isCalendarEnabled())
                .calendarVisibleForParents(settings.isCalendarVisibleForParents())
                .createdAt(settings.getCreatedAt())
                .updatedAt(settings.getUpdatedAt())
                .build();
    }
}
