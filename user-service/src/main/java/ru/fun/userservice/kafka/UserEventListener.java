package ru.fun.userservice.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import ru.fun.userservice.dto.auth.UserRegisteredEvent;
import ru.fun.userservice.dto.auth.UserRoleAssignedEvent;
import ru.fun.userservice.entity.AdminProfile;
import ru.fun.userservice.entity.CounselorProfile;
import ru.fun.userservice.entity.ParentProfile;
import ru.fun.userservice.entity.UserProfile;
import ru.fun.userservice.repository.AdminProfileRepository;
import ru.fun.userservice.repository.CounselorProfileRepository;
import ru.fun.userservice.repository.ParentProfileRepository;
import ru.fun.userservice.repository.UserProfileRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserEventListener {

    private final UserProfileRepository userProfileRepository;
    private final ParentProfileRepository parentProfileRepository;
    private final CounselorProfileRepository counselorProfileRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "user.registered", groupId = "user-service")
    public void handleUserRegistered(String message) throws Exception {
        UserRegisteredEvent event = objectMapper.readValue(message, UserRegisteredEvent.class);

        UUID userId = event.getUserId();

        if (userProfileRepository.existsById(userId)) {
            log.info("UserProfile already exists for {}", event.getEmail());
            return;
        }

        UserProfile profile = UserProfile.builder()
                .id(userId)
                .email(event.getEmail())
                .build();

        userProfileRepository.save(profile);
        log.info("Created UserProfile for {}", event.getEmail());
    }

    @KafkaListener(topics = "user.role-assigned", groupId = "user-service")
    public void handleUserRoleAssigned(String message) throws Exception {
        UserRoleAssignedEvent event = objectMapper.readValue(message, UserRoleAssignedEvent.class);
        UUID userId = UUID.fromString(event.getUserId());

        String role = event.getRole();
        String action = event.getAction();

        if ("ASSIGNED".equalsIgnoreCase(action)) {
            handleRoleAssigned(userId, role);
            return;
        }

        if ("REMOVED".equalsIgnoreCase(action)) {
            handleRoleRemoved(userId, role);
            return;
        }

        log.warn("Unknown action {} for user {} and role {}", action, userId, role);
    }

    private void handleRoleAssigned(UUID userId, String role) {
        UserProfile user = getOrThrow(userId);

        switch (role) {
            case "ROLE_ADMIN" -> {
                if (!adminProfileRepository.existsByUserProfile_Id(userId)) {
                    adminProfileRepository.save(
                            AdminProfile.builder()
                                    .userProfile(user)
                                    .build()
                    );
                    log.info("Created AdminProfile for user {}", userId);
                }
            }
            case "ROLE_PARENT" -> {
                if (!parentProfileRepository.existsByUserProfile_Id(userId)) {
                    parentProfileRepository.save(
                            ParentProfile.builder()
                                    .userProfile(user)
                                    .build()
                    );
                    log.info("Created ParentProfile for user {}", userId);
                }
            }
            case "ROLE_COUNSELOR" -> {
                if (!counselorProfileRepository.existsByUserProfile_Id(userId)) {
                    counselorProfileRepository.save(
                            CounselorProfile.builder()
                                    .userProfile(user)
                                    .build()
                    );
                    log.info("Created CounselorProfile for user {}", userId);
                }
            }
            default -> log.warn("Unknown role {} for user {} on ASSIGNED", role, userId);
        }
    }

    private void handleRoleRemoved(UUID userId, String role) {
        switch (role) {
            case "ROLE_ADMIN" -> {
                adminProfileRepository.findByUserProfile_Id(userId).ifPresent(profile -> {
                    adminProfileRepository.delete(profile);
                    log.info("Deleted AdminProfile for user {}", userId);
                });
            }
            case "ROLE_PARENT" -> {
                parentProfileRepository.findByUserProfile_Id(userId).ifPresent(profile -> {
                    parentProfileRepository.delete(profile);
                    log.info("Deleted ParentProfile for user {}", userId);
                });
            }
            case "ROLE_COUNSELOR" -> {
                counselorProfileRepository.findByUserProfile_Id(userId).ifPresent(profile -> {
                    counselorProfileRepository.delete(profile);
                    log.info("Deleted CounselorProfile for user {}", userId);
                });
            }
            default -> log.warn("Unknown role {} for user {} on REMOVED", role, userId);
        }
    }

    private UserProfile getOrThrow(UUID userId) {
        return userProfileRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("UserProfile not found: " + userId));
    }
}