package ru.fun.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fun.authservice.dto.UserRoleChangedEvent;
import ru.fun.authservice.entity.AdminSubscription;
import ru.fun.authservice.entity.Role;
import ru.fun.authservice.entity.User;
import ru.fun.authservice.kafka.UserEventProducer;
import ru.fun.authservice.repository.AdminSubscriptionRepository;
import ru.fun.authservice.repository.RoleRepository;
import ru.fun.authservice.repository.UserRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private final AdminSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserEventProducer userEventProducer;

    /**
     * Активировать подписку после успешной оплаты.
     * Идемпотентно — повторный вызов с тем же paymentId игнорируется.
     * После сохранения публикует событие в Kafka → user-service создаёт admin_profiles.
     */
    @Transactional
    public void activateAdminSubscription(UUID userId, String paymentId) {
        if (subscriptionRepository.findByPaymentId(paymentId).isPresent()) {
            log.info("Payment {} already processed, skipping", paymentId);
            return;
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                .orElseThrow(() -> new RuntimeException("ROLE_ADMIN not found in DB"));

        boolean alreadyHasRole = user.getRoles().stream()
                .anyMatch(r -> r.getName().equals("ROLE_ADMIN"));

        if (!alreadyHasRole) {
            user.getRoles().add(adminRole);
            userRepository.save(user);

            userEventProducer.publishUserRoleChanged(
                    new UserRoleChangedEvent(
                            userId.toString(),
                            "ROLE_ADMIN",
                            "ASSIGNED"
                    )
            );

            log.info("ROLE_ADMIN assigned to user {}", userId);
        }

        AdminSubscription sub = subscriptionRepository.findByUser(user)
                .orElse(AdminSubscription.builder().user(user).build());

        Instant base = (sub.getExpiresAt() != null && sub.getExpiresAt().isAfter(Instant.now()))
                ? sub.getExpiresAt()
                : Instant.now();

        sub.setExpiresAt(base.plus(30, ChronoUnit.DAYS));
        sub.setActive(true);
        sub.setPaymentId(paymentId);
        subscriptionRepository.save(sub);

        log.info("Admin subscription activated for user {} until {}", userId, sub.getExpiresAt());
    }

    public Optional<AdminSubscription> getSubscription(UUID userId) {
        return userRepository.findById(userId)
                .flatMap(subscriptionRepository::findByUser);
    }

    /**
     * Шедулер: каждую минуту ищет истёкшие подписки и снимает ROLE_ADMIN.
     * Публикует событие об отзыве роли → user-service удаляет запись из admin_profiles.
     */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void revokeExpiredSubscriptions() {
        List<AdminSubscription> expired = subscriptionRepository.findExpired(Instant.now());
        if (expired.isEmpty()) {
            return;
        }

        Role adminRole = roleRepository.findByName("ROLE_ADMIN").orElse(null);
        if (adminRole == null) {
            log.warn("ROLE_ADMIN not found, cannot revoke expired subscriptions");
            return;
        }

        for (AdminSubscription sub : expired) {
            User user = sub.getUser();

            boolean removed = user.getRoles().remove(adminRole);
            if (removed) {
                userRepository.save(user);

                userEventProducer.publishUserRoleChanged(
                        new UserRoleChangedEvent(
                                user.getId().toString(),
                                "ROLE_ADMIN",
                                "REMOVED"
                        )
                );

                log.info("ROLE_ADMIN revoked from user {} — subscription expired at {}",
                        user.getId(), sub.getExpiresAt());
            }

            sub.setActive(false);
            subscriptionRepository.save(sub);
        }
    }
}