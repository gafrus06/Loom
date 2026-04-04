package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fun.userservice.dto.UserBulkProfileResponse;
import ru.fun.userservice.entity.UserProfile;
import ru.fun.userservice.repository.UserProfileRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserBulkLookupService {

    private final UserProfileRepository userProfileRepository;

    @Transactional(readOnly = true)
    public List<UserBulkProfileResponse> findProfiles(List<UUID> userIds) {
        return userProfileRepository.findAllById(userIds).stream()
                .map(this::toResponse)
                .toList();
    }

    private UserBulkProfileResponse toResponse(UserProfile profile) {
        return UserBulkProfileResponse.builder()
                .id(profile.getId())
                .firstName(profile.getFirstName())
                .lastName(profile.getSecondName())
                .middleName(profile.getThirdName())
                .phone(profile.getPhone())
                .avatarFileId(profile.getAvatarFileId())
                .build();
    }
}
