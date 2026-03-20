package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ru.fun.userservice.dto.*;
import ru.fun.userservice.dto.file.DownloadUrlResponse;
import ru.fun.userservice.dto.file.UploadUrlResponse;
import ru.fun.userservice.entity.AdminProfile;
import ru.fun.userservice.entity.CounselorProfile;
import ru.fun.userservice.entity.ParentProfile;
import ru.fun.userservice.entity.UserProfile;
import ru.fun.userservice.repository.CounselorProfileRepository;
import ru.fun.userservice.repository.ParentProfileRepository;
import ru.fun.userservice.repository.UserProfileRepository;
import ru.fun.userservice.rest.client.AuthServiceClient;
import ru.fun.userservice.rest.client.FileStorageClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileFacade {

    private final UserProfileService userProfileService;
    private final UserProfileRepository userProfileRepository;
    private final AuthServiceClient authServiceClient;
    private final FileStorageClient fileStorageClient;
    private final ParentProfileRepository parentProfileRepository;
    private final CounselorProfileRepository counselorProfileRepository;
    private final CounselorProfileService counselorProfileService;

    public UserProfileResponse getCurrentUserProfile(UUID userId, List<String> rolesFromGateway) {
        UserProfile user = userProfileService.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, userId + " not found"));
        return buildResponse(user, rolesFromGateway);
    }

    public UserProfileResponse updateCurrentUserProfile(UUID userId,
                                                        EditUserProfileRequest updatedProfile,
                                                        List<String> rolesFromGateway) {
        UserProfile user = userProfileService.updateProfileEntity(userId, updatedProfile);
        return buildResponse(user, rolesFromGateway);
    }

    public UserProfileResponse getUserProfileById(UUID id) {
        UserProfile user = userProfileService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, id + " not found"));
        List<String> roles = authServiceClient.getRolesByUserId(id).getRole();
        return buildResponse(user, roles);
    }

    /**
     * Используется из UserListingService.
     * Принимает предзагруженные батч-запросом данные — никаких дополнительных запросов к БД.
     *
     * @param user      сущность пользователя
     * @param parent    ParentProfile или null
     * @param counselor CounselorProfile или null
     * @param admin     AdminProfile или null
     */
    public UserProfileResponse buildResponseForListing(
            UserProfile user,
            ParentProfile parent,
            CounselorProfile counselor,
            AdminProfile admin
    ) {
        var rb = UserProfileResponse.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .secondName(user.getSecondName())
                .thirdName(user.getThirdName())
                .phone(user.getPhone())
                .phoneVerified(Boolean.TRUE.equals(user.getPhoneVerified()))
                .avatarFileId(user.getAvatarFileId())
                .roles(inferRoles(parent, counselor, admin));

        resolveAvatarUrl(user).ifPresent(rb::avatarUrl);

        if (parent != null)    rb.parent(toParentDto(parent));
        if (counselor != null) rb.counselor(toCounselorDto(counselor));

        return rb.build();
    }

    public UploadUrlResponse generateAvatarUploadUrl(UUID userId, String filename, String contentType) {
        return fileStorageClient.generateUploadUrl("user-service", "avatar", filename, contentType);
    }

    @Transactional
    public void confirmAvatarUpload(UUID userId, UUID fileId) {
        fileStorageClient.confirmUpload(fileId, userId.toString());
        UserProfile user = userProfileService.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setAvatarFileId(fileId);
        userProfileRepository.save(user);
        log.info("Avatar uploaded for user={}, fileId={}", userId, fileId);
    }

    public UploadUrlResponse generateEducationDocUploadUrl(UUID userId, String filename, String contentType) {
        return fileStorageClient.generateUploadUrl("user-service", "education-doc", filename, contentType);
    }

    // ── internal ─────────────────────────────────────────────────────────────

    /**
     * Приоритет ролей: ADMIN > COUNSELOR > PARENT > USER.
     * Пользователь может иметь несколько ролей одновременно.
     */
    private List<String> inferRoles(ParentProfile parent, CounselorProfile counselor, AdminProfile admin) {
        List<String> roles = new ArrayList<>();
        if (admin != null)     roles.add("ROLE_ADMIN");
        if (counselor != null) roles.add("ROLE_COUNSELOR");
        if (parent != null)    roles.add("ROLE_PARENT");
        if (roles.isEmpty())   roles.add("ROLE_USER");
        return roles;
    }

    private UserProfileResponse buildResponse(UserProfile user, List<String> roles) {
        var rb = UserProfileResponse.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .secondName(user.getSecondName())
                .thirdName(user.getThirdName())
                .phone(user.getPhone())
                .phoneVerified(Boolean.TRUE.equals(user.getPhoneVerified()))
                .avatarFileId(user.getAvatarFileId())
                .roles(roles);

        resolveAvatarUrl(user).ifPresent(rb::avatarUrl);

        parentProfileRepository.findByUserProfile_Id(user.getId())
                .map(this::toParentDto)
                .ifPresent(rb::parent);

        CounselorProfileDto counselorDto = counselorProfileService.getDto(user.getId());
        if (counselorDto != null) rb.counselor(counselorDto);

        return rb.build();
    }

    private Optional<String> resolveAvatarUrl(UserProfile user) {
        if (user.getAvatarFileId() == null) return Optional.empty();
        try {
            DownloadUrlResponse d = fileStorageClient.getDownloadUrl(user.getAvatarFileId());
            return Optional.ofNullable(d.getDownloadUrl());
        } catch (Exception e) {
            log.warn("Failed to get avatar download URL for user={}: {}", user.getId(), e.getMessage());
            return Optional.empty();
        }
    }

    private ParentProfileDto toParentDto(ParentProfile p) {
        return ParentProfileDto.builder()
                .emergencyContactName(p.getEmergencyContactName())
                .emergencyContactPhone(p.getEmergencyContactPhone())
                .address(p.getAddress())
                .notes(p.getNotes())
                .build();
    }

    private CounselorProfileDto toCounselorDto(CounselorProfile c) {
        return CounselorProfileDto.builder()
                .specialization(c.getSpecialization())
                .experienceYears(c.getExperienceYears())
                .bio(c.getBio())
                .educationDocumentIds(c.getEducationDocumentIds())
                .telegram(c.getTelegram())
                .shiftPreference(c.getShiftPreference())
                .build();
    }
}