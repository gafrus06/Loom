package ru.fun.userservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fun.userservice.dto.auth.UserRegisteredEvent;
import ru.fun.userservice.dto.auth.UserRoleChangedEvent;
import ru.fun.userservice.entity.AdminProfile;
import ru.fun.userservice.entity.CounselorProfile;
import ru.fun.userservice.entity.ParentProfile;
import ru.fun.userservice.entity.UserProfile;
import ru.fun.userservice.repository.AdminProfileRepository;
import ru.fun.userservice.repository.CounselorProfileRepository;
import ru.fun.userservice.repository.ParentProfileRepository;
import ru.fun.userservice.repository.ProcessedAuthEventRepository;
import ru.fun.userservice.repository.UserProfileRepository;
import ru.fun.userservice.entity.ProcessedAuthEvent;
import ru.fun.userservice.service.CounselorProfileService;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserEventListener {

    private final UserProfileRepository userProfileRepository;
    private final ParentProfileRepository parentProfileRepository;
    private final CounselorProfileRepository counselorProfileRepository;
    private final AdminProfileRepository adminProfileRepository;
    private final CounselorProfileService counselorProfileService;
    private final ProcessedAuthEventRepository processedAuthEventRepository;

    @KafkaListener(
            topics = "user.registered",
            groupId = "user-service",
            containerFactory = "userRegisteredListenerFactory"
    )
    @Transactional
    public void handleUserRegistered(UserRegisteredEvent event) {
        if (event == null || event.getUserId() == null) {
            log.warn("Ignoring malformed UserRegisteredEvent: {}", event);
            return;
        }

        UUID userId = UUID.fromString(event.getUserId());

        if (userProfileRepository.existsById(userId)) {
            markProcessed(event.getEventId());
            log.debug("UserProfile already exists for userId={}, skipping", userId);
            return;
        }

        if (isDuplicate(event.getEventId())) {
            log.warn(
                    "Processed UserRegisteredEvent {} has no UserProfile for userId={}; recreating profile",
                    event.getEventId(),
                    userId
            );
        }

        UserProfile profile = UserProfile.builder()
                .id(userId)
                .email(event.getEmail())
                .build();

        userProfileRepository.save(profile);
        markProcessed(event.getEventId());
        log.info("Created UserProfile for userId={} email={}", userId, event.getEmail());
    }

    @KafkaListener(
            topics = {"user.role.changed", "user.role-assigned"},
            groupId = "user-service",
            containerFactory = "userRoleAssignedListenerFactory"
    )
    @Transactional
    public void handleUserRoleChanged(UserRoleChangedEvent event) {
        if (event == null || event.getUserId() == null) {
            log.warn("Ignoring malformed UserRoleChangedEvent: {}", event);
            return;
        }
        if (isDuplicate(event.getEventId())) {
            return;
        }
        UUID userId = UUID.fromString(event.getUserId());
        String role = event.getRole();
        String action = event.getAction();

        log.info("Role event: userId={} role={} action={}", userId, role, action);

        if ("ASSIGNED".equalsIgnoreCase(action)) {
            handleRoleAssigned(userId, role);
            markProcessed(event.getEventId());
            return;
        }
        if ("REMOVED".equalsIgnoreCase(action)) {
            handleRoleRemoved(userId, role);
            markProcessed(event.getEventId());
            return;
        }

        log.warn("Unknown action={} for userId={} role={}", action, userId, role);
    }

    private void handleRoleAssigned(UUID userId, String role) {
        switch (role) {
            case "ROLE_ADMIN" -> {
                if (!adminProfileRepository.existsByUserProfile_Id(userId)) {
                    UserProfile user = getOrThrow(userId);
                    adminProfileRepository.save(AdminProfile.builder().userProfile(user).build());
                    log.info("Created AdminProfile for userId={}", userId);
                }
            }
            case "ROLE_PARENT" -> {
                if (!parentProfileRepository.existsByUserProfile_Id(userId)) {
                    UserProfile user = getOrThrow(userId);
                    parentProfileRepository.save(ParentProfile.builder().userProfile(user).build());
                    log.info("Created ParentProfile for userId={}", userId);
                }
            }
            case "ROLE_COUNSELOR" -> {
                if (!counselorProfileRepository.existsByUserProfile_Id(userId)) {
                    UserProfile user = getOrThrow(userId);
                    counselorProfileRepository.save(CounselorProfile.builder().userProfile(user).build());
                    log.info("Created CounselorProfile for userId={}", userId);
                }
            }
            default -> log.debug("No profile action needed for role={} userId={}", role, userId);
        }
    }

    private void handleRoleRemoved(UUID userId, String role) {
        switch (role) {
            case "ROLE_ADMIN" -> adminProfileRepository.findByUserProfile_Id(userId)
                    .ifPresentOrElse(
                            p -> {
                                adminProfileRepository.delete(p);
                                log.info("Deleted AdminProfile for userId={}", userId);
                            },
                            () -> log.warn("AdminProfile not found for userId={} on REMOVED", userId)
                    );
            case "ROLE_PARENT" -> parentProfileRepository.findByUserProfile_Id(userId)
                    .ifPresentOrElse(
                            p -> {
                                parentProfileRepository.delete(p);
                                log.info("Deleted ParentProfile for userId={}", userId);
                            },
                            () -> log.warn("ParentProfile not found for userId={} on REMOVED", userId)
                    );
            case "ROLE_COUNSELOR" -> {
                if (counselorProfileRepository.existsByUserProfile_Id(userId)) {
                    counselorProfileService.deleteByUserId(userId);
                    log.info("Deleted CounselorProfile for userId={}", userId);
                } else {
                    log.warn("CounselorProfile not found for userId={} on REMOVED", userId);
                }
            }
            default -> log.debug("No profile removal needed for role={} userId={}", role, userId);
        }
    }

    private UserProfile getOrThrow(UUID userId) {
        return userProfileRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("UserProfile not found for userId=" + userId));
    }

    private boolean isDuplicate(UUID eventId) {
        if (eventId == null) {
            return false;
        }
        if (processedAuthEventRepository.existsById(eventId)) {
            log.debug("Auth event {} already processed, skipping duplicate delivery", eventId);
            return true;
        }
        return false;
    }

    private void markProcessed(UUID eventId) {
        if (eventId != null) {
            processedAuthEventRepository.save(new ProcessedAuthEvent(eventId, java.time.Instant.now()));
        }
    }
}
