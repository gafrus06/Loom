package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import ru.fun.userservice.dto.UserProfilePageResponse;
import ru.fun.userservice.dto.UserProfileResponse;
import ru.fun.userservice.entity.AdminProfile;
import ru.fun.userservice.entity.CounselorProfile;
import ru.fun.userservice.entity.ParentProfile;
import ru.fun.userservice.entity.UserProfile;
import ru.fun.userservice.repository.AdminProfileRepository;
import ru.fun.userservice.repository.CounselorProfileRepository;
import ru.fun.userservice.repository.ParentProfileRepository;
import ru.fun.userservice.repository.UserProfileRepository;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Листинг пользователей без N+1.
 *
 * Итого 4 запроса на любой размер страницы:
 *   1. SELECT * FROM users LIMIT ? OFFSET ?
 *   2. SELECT * FROM parents     WHERE user_id IN (...)
 *   3. SELECT * FROM counselors  WHERE user_id IN (...)
 *   4. SELECT * FROM admin_profiles WHERE user_id IN (...)
 */
@Service
@RequiredArgsConstructor
public class UserListingService {

    private final UserProfileRepository userProfileRepository;
    private final ParentProfileRepository parentProfileRepository;
    private final CounselorProfileRepository counselorProfileRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final UserProfileFacade userProfileFacade;

    public UserProfilePageResponse listUsers(int page, int size, String roleFilter) {
        Page<UserProfile> userPage = userProfileRepository.findAll(PageRequest.of(page, size));
        List<UserProfile> content = userPage.getContent();

        if (content.isEmpty()) {
            return new UserProfilePageResponse(
                    List.of(),
                    userPage.getNumber(),
                    userPage.getTotalPages(),
                    userPage.getTotalElements()
            );
        }

        Set<UUID> userIds = content.stream()
                .map(UserProfile::getId)
                .collect(Collectors.toSet());

        // 3 батч-запроса на всю страницу
        Map<UUID, ParentProfile> parentsByUserId = parentProfileRepository
                .findAllByUserProfileIdIn(userIds).stream()
                .collect(Collectors.toMap(p -> p.getUserProfile().getId(), p -> p));

        Map<UUID, CounselorProfile> counselorsByUserId = counselorProfileRepository
                .findAllByUserProfileIdIn(userIds).stream()
                .collect(Collectors.toMap(c -> c.getUserProfile().getId(), c -> c));

        Map<UUID, AdminProfile> adminsByUserId = adminProfileRepository
                .findAllByUserProfileIdIn(userIds).stream()
                .collect(Collectors.toMap(a -> a.getUserProfile().getId(), a -> a));

        List<UserProfile> filtered = applyRoleFilter(
                content, roleFilter, parentsByUserId, counselorsByUserId, adminsByUserId
        );
        Map<UUID, String> avatarUrlsByFileId = userProfileFacade.resolveAvatarUrls(filtered);

        List<UserProfileResponse> users = filtered.stream()
                .map(u -> userProfileFacade.buildResponseForListing(
                        u,
                        parentsByUserId.get(u.getId()),
                        counselorsByUserId.get(u.getId()),
                        adminsByUserId.get(u.getId()),
                        u.getAvatarFileId() != null ? avatarUrlsByFileId.get(u.getAvatarFileId()) : null
                ))
                .collect(Collectors.toList());

        return new UserProfilePageResponse(
                users,
                userPage.getNumber(),
                userPage.getTotalPages(),
                userPage.getTotalElements()
        );
    }

    private List<UserProfile> applyRoleFilter(
            List<UserProfile> users,
            String roleFilter,
            Map<UUID, ParentProfile> parentsByUserId,
            Map<UUID, CounselorProfile> counselorsByUserId,
            Map<UUID, AdminProfile> adminsByUserId
    ) {
        if (roleFilter == null) return users;
        return switch (roleFilter.toUpperCase()) {
            case "ADMIN"     -> users.stream().filter(u ->  adminsByUserId.containsKey(u.getId())).collect(Collectors.toList());
            case "PARENT"    -> users.stream().filter(u -> parentsByUserId.containsKey(u.getId())).collect(Collectors.toList());
            case "COUNSELOR" -> users.stream().filter(u -> counselorsByUserId.containsKey(u.getId())).collect(Collectors.toList());
            default          -> users;
        };
    }
}
