package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ru.fun.userservice.dto.CounselorProfileDto;
import ru.fun.userservice.dto.ParentProfileDto;
import ru.fun.userservice.dto.UserProfileResponse;
import ru.fun.userservice.dto.UserPublicProfileResponse;
import ru.fun.userservice.dto.EditUserProfileRequest;
import ru.fun.userservice.dto.file.DownloadUrlResponse;
import ru.fun.userservice.dto.file.DownloadUrlsRequest;
import ru.fun.userservice.dto.file.UploadUrlResponse;
import ru.fun.userservice.entity.AdminProfile;
import ru.fun.userservice.entity.CounselorProfile;
import ru.fun.userservice.entity.ParentProfile;
import ru.fun.userservice.entity.UserProfile;
import ru.fun.userservice.repository.AdminProfileRepository;
import ru.fun.userservice.repository.CounselorProfileRepository;
import ru.fun.userservice.repository.ParentProfileRepository;
import ru.fun.userservice.repository.UserProfileRepository;
import ru.fun.userservice.rest.client.AuthServiceClient;
import ru.fun.userservice.rest.client.FileStorageClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileFacade {

    private final UserProfileService userProfileService;
    private final UserProfileRepository userProfileRepository;
    private final AuthServiceClient authServiceClient;
    private final FileStorageClient fileStorageClient;
    private final AdminProfileRepository adminProfileRepository;
    private final ParentProfileRepository parentProfileRepository;
    private final CounselorProfileRepository counselorProfileRepository;
    private final CounselorProfileService counselorProfileService;

    @Transactional
    public UserProfileResponse getCurrentUserProfile(UUID userId, String email, List<String> rolesFromGateway) {
        UserProfile user = userProfileService.findById(userId)
                .orElseGet(() -> createMissingProfile(userId, email));
        return buildResponse(user, rolesFromGateway);
    }

    public UserProfileResponse getCurrentUserProfile(UUID userId, List<String> rolesFromGateway) {
        UserProfile user = userProfileService.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId));
        return buildResponse(user, rolesFromGateway);
    }

    public UserProfileResponse updateCurrentUserProfile(UUID userId,
                                                        EditUserProfileRequest request,
                                                        List<String> rolesFromGateway) {
        UserProfile user = userProfileService.updateProfileEntity(userId, request);
        return buildResponse(user, rolesFromGateway);
    }

    public UserProfileResponse getUserProfileById(UUID id) {
        UserProfile user = userProfileService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id));

        List<String> roles;
        try {
            roles = authServiceClient.getRolesByUserId(id).getRoleNames();
        } catch (Exception ex) {
            log.warn("Failed to fetch roles from auth-service for userId={}. Falling back to local profile inference. Cause: {}", id, ex.getMessage());
            ParentProfile parent = parentProfileRepository.findByUserProfile_Id(id).orElse(null);
            CounselorProfile counselor = counselorProfileRepository.findByUserProfile_Id(id).orElse(null);
            AdminProfile admin = adminProfileRepository.findByUserProfile_Id(id).orElse(null);
            roles = inferRolesFromProfiles(parent, counselor, admin);
        }

        return buildResponse(user, roles);
    }

    public UserPublicProfileResponse getPublicProfile(UUID id) {
        UserProfile user = userProfileService.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id));

        CounselorProfile counselor = counselorProfileRepository.findByUserProfile_Id(id).orElse(null);
        String avatarUrl = resolveAvatarUrl(user).orElse(null);

        return UserPublicProfileResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .secondName(user.getSecondName())
                .thirdName(user.getThirdName())
                .avatarUrl(avatarUrl)
                .specialization(counselor != null ? counselor.getSpecialization() : null)
                .bio(counselor != null ? counselor.getBio() : null)
                .experienceYears(counselor != null ? counselor.getExperienceYears() : null)
                .countOfCompletedShifts(counselor != null ? counselor.getCountOfCompletedShifts() : null)
                .rating(counselor != null ? counselor.getRating() : null)
                .build();
    }

    public UserProfileResponse buildResponseForListing(
            UserProfile user,
            ParentProfile parent,
            CounselorProfile counselor,
            AdminProfile admin,
            String avatarUrl,
            List<String> roles
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
                .active(Boolean.TRUE.equals(user.getActive()))
                .roles(roles);

        if (avatarUrl != null) {
            rb.avatarUrl(avatarUrl);
        }

        if (parent != null) {
            rb.parent(toParentDto(parent));
        }
        if (counselor != null) {
            rb.counselor(toCounselorDto(counselor));
        }

        return rb.build();
    }

    public Map<UUID, List<String>> resolveRolesForUsers(List<UUID> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<UUID, List<String>> rolesByUserId = new HashMap<>();
        for (UUID userId : userIds) {
            rolesByUserId.put(userId, resolveRolesForUser(userId));
        }
        return rolesByUserId;
    }

    public List<String> resolveRolesForUser(UUID userId) {
        try {
            List<String> roles = authServiceClient.getRolesByUserId(userId).getRoleNames();
            if (roles != null && !roles.isEmpty()) {
                return roles;
            }
        } catch (Exception ex) {
            log.warn("Failed to fetch roles from auth-service for userId={}. Falling back to local profile inference. Cause: {}", userId, ex.getMessage());
        }

        ParentProfile parent = parentProfileRepository.findByUserProfile_Id(userId).orElse(null);
        CounselorProfile counselor = counselorProfileRepository.findByUserProfile_Id(userId).orElse(null);
        AdminProfile admin = adminProfileRepository.findByUserProfile_Id(userId).orElse(null);
        return inferRolesFromProfiles(parent, counselor, admin);
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
        log.info("Avatar confirmed: userId={} fileId={}", userId, fileId);
    }

    public UploadUrlResponse generateEducationDocUploadUrl(UUID userId, String filename, String contentType) {
        return fileStorageClient.generateUploadUrl("user-service", "education-doc", filename, contentType);
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
                .active(Boolean.TRUE.equals(user.getActive()))
                .roles(roles);

        resolveAvatarUrl(user).ifPresent(rb::avatarUrl);

        parentProfileRepository.findByUserProfile_Id(user.getId())
                .map(this::toParentDto)
                .ifPresent(rb::parent);

        CounselorProfileDto counselorDto = counselorProfileService.getDto(user.getId());
        if (counselorDto != null) {
            rb.counselor(counselorDto);
        }

        return rb.build();
    }

    private List<String> inferRolesFromProfiles(ParentProfile parent,
                                                CounselorProfile counselor,
                                                AdminProfile admin) {
        List<String> roles = new ArrayList<>();
        if (admin != null) {
            roles.add("ROLE_ADMIN");
        }
        if (counselor != null) {
            roles.add("ROLE_COUNSELOR");
        }
        if (parent != null) {
            roles.add("ROLE_PARENT");
        }
        if (roles.isEmpty()) {
            roles.add("ROLE_USER");
        }
        return roles;
    }

    private UserProfile createMissingProfile(UUID userId, String email) {
        String resolvedEmail = isBlank(email) ? userId + "@unknown.local" : email;
        log.warn("UserProfile was missing for authenticated userId={}; creating fallback profile", userId);
        return userProfileRepository.save(UserProfile.builder()
                .id(userId)
                .email(resolvedEmail)
                .build());
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private Optional<String> resolveAvatarUrl(UserProfile user) {
        if (user.getAvatarFileId() == null) {
            return Optional.empty();
        }
        try {
            DownloadUrlResponse response = fileStorageClient.getDownloadUrl(user.getAvatarFileId());
            return Optional.ofNullable(response.getDownloadUrl());
        } catch (Exception e) {
            log.warn("Failed to get avatar URL for userId={}: {}", user.getId(), e.getMessage());
            return Optional.empty();
        }
    }

    public Map<UUID, String> resolveAvatarUrls(List<UserProfile> users) {
        List<UUID> avatarFileIds = users.stream()
                .map(UserProfile::getAvatarFileId)
                .filter(id -> id != null)
                .distinct()
                .toList();
        if (avatarFileIds.isEmpty()) {
            return Collections.emptyMap();
        }

        try {
            DownloadUrlsRequest request = new DownloadUrlsRequest();
            request.setFileIds(avatarFileIds);
            return new HashMap<>(fileStorageClient.getDownloadUrls(request).getUrls());
        } catch (Exception ex) {
            log.warn("Failed to bulk resolve avatar URLs: {}", ex.getMessage());
            return Collections.emptyMap();
        }
    }

    private ParentProfileDto toParentDto(ParentProfile profile) {
        return ParentProfileDto.builder()
                .emergencyContactName(profile.getEmergencyContactName())
                .emergencyContactPhone(profile.getEmergencyContactPhone())
                .emergencyContactRelation(profile.getEmergencyContactRelation())
                .address(profile.getAddress())
                .notes(profile.getNotes())
                .build();
    }

    private CounselorProfileDto toCounselorDto(CounselorProfile profile) {
        return CounselorProfileDto.builder()
                .specialization(profile.getSpecialization())
                .experienceYears(profile.getExperienceYears())
                .bio(profile.getBio())
                .educationDocumentIds(profile.getEducationDocumentIds())
                .telegram(profile.getTelegram())
                .shiftPreference(profile.getShiftPreference())
                .countOfCompletedShifts(profile.getCountOfCompletedShifts())
                .rating(profile.getRating())
                .ratingCount(profile.getRatingCount())
                .build();
    }
}
