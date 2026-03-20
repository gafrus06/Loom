package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
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

    public ProfileCompletionStatusResponse getStatus(UUID userId) {
        UserProfile user = userProfileRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User " + userId + " not found"));

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

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
