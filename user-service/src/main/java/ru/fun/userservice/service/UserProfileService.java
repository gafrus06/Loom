package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import ru.fun.userservice.dto.EditUserProfileRequest;
import ru.fun.userservice.entity.UserProfile;
import ru.fun.userservice.repository.UserProfileRepository;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;

    public UserProfile updateProfileEntity(UUID userId, EditUserProfileRequest request) {
        UserProfile user = userProfileRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + userId));

        if (request.getFirstName()  != null) user.setFirstName(request.getFirstName());
        if (request.getSecondName() != null) user.setSecondName(request.getSecondName());
        if (request.getThirdName()  != null) user.setThirdName(request.getThirdName());
        if (request.getPhone()      != null) user.setPhone(request.getPhone());


        return userProfileRepository.save(user);
    }

    public Optional<UserProfile> findById(UUID id) {
        return userProfileRepository.findById(id);
    }
}