package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fun.userservice.dto.ProfileCompletionStatusResponse;
import ru.fun.userservice.entity.UserProfile;
import ru.fun.userservice.repository.UserProfileRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileCompletionService {

    private final UserProfileRepository userProfileRepository;

    @Transactional
    public ProfileCompletionStatusResponse getStatus(UUID userId, String email) {
        UserProfile user = userProfileRepository.findById(userId)
                .orElseGet(() -> createMissingProfile(userId, email));

        return buildStatus(user);
    }

    public ProfileCompletionStatusResponse getStatus(UUID userId) {
        UserProfile user = userProfileRepository.findById(userId)
                .orElseGet(() -> createMissingProfile(userId, null));

        return buildStatus(user);
    }

    private ProfileCompletionStatusResponse buildStatus(UserProfile user) {
        List<String> missing = new ArrayList<>(4);

        // Имя/Фамилия обязательны
        if (isBlank(user.getFirstName())) missing.add("firstName");
        if (isBlank(user.getSecondName())) missing.add("secondName");

        // Телефон обязателен + должен быть подтвержден
        if (isBlank(user.getPhone())) {
            missing.add("phone");
        } else if (!Boolean.TRUE.equals(user.getPhoneVerified())) {
            // телефон есть, но не подтвержден
            missing.add("phoneVerification");
        }

        return new ProfileCompletionStatusResponse(missing.isEmpty(), missing);
    }

    private UserProfile createMissingProfile(UUID userId, String email) {
        String resolvedEmail = isBlank(email) ? userId + "@unknown.local" : email;
        return userProfileRepository.save(UserProfile.builder()
                .id(userId)
                .email(resolvedEmail)
                .build());
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
