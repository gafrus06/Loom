package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ru.fun.userservice.dto.notification.PhoneVerificationConfirmRequest;
import ru.fun.userservice.dto.notification.PhoneVerificationStartEvent;
import ru.fun.userservice.dto.notification.VerifyResponse;
import ru.fun.userservice.kafka.NotificationEventPublisher;
import ru.fun.userservice.repository.UserProfileRepository;
import ru.fun.userservice.rest.client.NotificationClient;

import java.util.UUID;

/**
 * Оркестрирует запуск и подтверждение верификации телефона.
 * Ранее эта логика была размазана по UserProfileController.
 */
@Service
@RequiredArgsConstructor
public class PhoneVerificationService {

    private final NotificationEventPublisher notificationEventPublisher;
    private final NotificationClient notificationClient;
    private final UserProfileService userProfileService;
    private final UserProfileRepository userProfileRepository;

    public void startVerification(UUID userId, String phone) {
        PhoneVerificationStartEvent evt = new PhoneVerificationStartEvent();
        evt.setUserId(userId);
        evt.setPhone(phone);
        notificationEventPublisher.publish(evt);
    }

    @Transactional
    public VerifyResponse confirmVerification(UUID userId, PhoneVerificationConfirmRequest req) {
        VerifyResponse vr = notificationClient.verify(req);

        if (vr.isVerified()) {
            var user = userProfileService.findById(userId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

            if (!req.getPhone().equals(user.getPhone())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone mismatch");
            }

            user.setPhoneVerified(true);
            userProfileRepository.save(user);
        }

        return vr;
    }
}