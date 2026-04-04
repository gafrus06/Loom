package ru.fun.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fun.authservice.dto.UserRoleChangedEvent;
import ru.fun.authservice.entity.AdminSubscription;
import ru.fun.authservice.entity.AppRole;
import ru.fun.authservice.entity.SubscriptionPayment;
import ru.fun.authservice.entity.SubscriptionWebhookEvent;
import ru.fun.authservice.entity.User;
import ru.fun.authservice.entity.UserRole;
import ru.fun.authservice.repository.AdminSubscriptionRepository;
import ru.fun.authservice.repository.SubscriptionPaymentRepository;
import ru.fun.authservice.repository.SubscriptionWebhookEventRepository;
import ru.fun.authservice.repository.UserRepository;
import ru.fun.authservice.repository.UserRoleRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionService {

    private static final String TYPE_NEW = "NEW";
    private static final String TYPE_RENEWAL = "RENEWAL";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_SUCCEEDED = "SUCCEEDED";
    private static final String STATUS_CANCELED = "CANCELED";
    private static final String STATUS_FAILED = "FAILED";
    private static final Duration REUSE_PENDING_WINDOW = Duration.ofMinutes(15);

    private final AdminSubscriptionRepository subscriptionRepository;
    private final SubscriptionPaymentRepository paymentRepository;
    private final SubscriptionWebhookEventRepository webhookEventRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository roleRepository;
    private final OutboxService outboxService;
    private final YooKassaService yooKassaService;

    @Transactional
    public PaymentSession createPayment(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        boolean renewal = getSubscription(userId)
                .filter(AdminSubscription::isActive)
                .map(AdminSubscription::getExpiresAt)
                .filter(expiresAt -> expiresAt.isAfter(Instant.now()))
                .isPresent();

        String paymentType = renewal ? TYPE_RENEWAL : TYPE_NEW;
        Optional<SubscriptionPayment> reusablePending = paymentRepository
                .findTopByUserAndPaymentTypeAndStatusOrderByCreatedAtDesc(user, paymentType, STATUS_PENDING)
                .filter(payment -> payment.getCreatedAt().isAfter(Instant.now().minus(REUSE_PENDING_WINDOW)));

        if (reusablePending.isPresent()) {
            SubscriptionPayment existing = reusablePending.get();
            return new PaymentSession(existing.getPaymentId(), existing.getConfirmationUrl(), renewal);
        }

        String requestKey = UUID.randomUUID().toString();
        YooKassaService.PaymentResult result = yooKassaService.createPayment(userId, renewal, requestKey);
        String initialStatus = result.confirmationUrl() == null ? STATUS_SUCCEEDED : STATUS_PENDING;

        SubscriptionPayment payment = SubscriptionPayment.builder()
                .user(user)
                .paymentId(result.paymentId())
                .requestKey(requestKey)
                .paymentType(paymentType)
                .status(initialStatus)
                .confirmationUrl(result.confirmationUrl())
                .build();
        paymentRepository.save(payment);

        if (STATUS_SUCCEEDED.equals(initialStatus)) {
            applySuccessfulPayment(payment);
        }

        return new PaymentSession(payment.getPaymentId(), payment.getConfirmationUrl(), renewal);
    }

    @Transactional
    public void processWebhook(String rawBody, String eventType, String paymentId, String status, UUID userId) {
        String deliveryKey = sha256(rawBody);
        SubscriptionWebhookEvent webhookEvent = webhookEventRepository.findByDeliveryKey(deliveryKey)
                .orElseGet(() -> webhookEventRepository.save(SubscriptionWebhookEvent.builder()
                        .deliveryKey(deliveryKey)
                        .paymentId(paymentId)
                        .eventType(eventType)
                        .rawBody(rawBody)
                        .processed(false)
                        .build()));

        if (webhookEvent.isProcessed()) {
            log.info("Webhook delivery {} already processed", deliveryKey);
            return;
        }

        SubscriptionPayment payment = paymentRepository.findByPaymentId(paymentId)
                .orElseGet(() -> createRecoveredPayment(userId, paymentId));

        switch (status) {
            case "succeeded" -> {
                payment.setStatus(STATUS_SUCCEEDED);
                paymentRepository.save(payment);
                applySuccessfulPayment(payment);
            }
            case "canceled", "cancelled" -> {
                payment.setStatus(STATUS_CANCELED);
                paymentRepository.save(payment);
            }
            case "failed" -> {
                payment.setStatus(STATUS_FAILED);
                paymentRepository.save(payment);
            }
            default -> log.info("Ignoring payment {} with unsupported status {}", paymentId, status);
        }

        webhookEvent.setProcessed(true);
        webhookEventRepository.save(webhookEvent);
    }

    public Optional<AdminSubscription> getSubscription(UUID userId) {
        return userRepository.findById(userId)
                .flatMap(subscriptionRepository::findByUser);
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void revokeExpiredSubscriptions() {
        List<AdminSubscription> expired = subscriptionRepository.findExpired(Instant.now());
        if (expired.isEmpty()) {
            return;
        }

        for (AdminSubscription sub : expired) {
            User user = sub.getUser();

            roleRepository.findByUserIdAndRoleAndActiveTrue(user.getId(), AppRole.ROLE_ADMIN.value())
                    .ifPresent(adminRole -> {
                        adminRole.setActive(false);
                        adminRole.setRevokedAt(Instant.now());
                        adminRole.setRevokedByUserId(null);
                        roleRepository.save(adminRole);

                        outboxService.enqueue(
                                OutboxPublisher.USER_ROLE_CHANGED,
                                user.getId(),
                                new UserRoleChangedEvent(user.getId().toString(), AppRole.ROLE_ADMIN.value(), "REMOVED")
                        );
                        bumpTokenVersion(user);
                    });

            sub.setActive(false);
            subscriptionRepository.save(sub);
        }
    }

    private SubscriptionPayment createRecoveredPayment(UUID userId, String paymentId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        return paymentRepository.save(SubscriptionPayment.builder()
                .user(user)
                .paymentId(paymentId)
                .requestKey("recovered-" + paymentId)
                .paymentType(resolvePaymentType(userId))
                .status(STATUS_PENDING)
                .confirmationUrl(null)
                .build());
    }

    private String resolvePaymentType(UUID userId) {
        return getSubscription(userId)
                .filter(AdminSubscription::isActive)
                .map(AdminSubscription::getExpiresAt)
                .filter(expiresAt -> expiresAt.isAfter(Instant.now()))
                .map(ignored -> TYPE_RENEWAL)
                .orElse(TYPE_NEW);
    }

    private void applySuccessfulPayment(SubscriptionPayment payment) {
        if (payment.isEntitlementApplied()) {
            return;
        }

        User user = payment.getUser();
        if (assignAdminRoleIfNeeded(user)) {
            outboxService.enqueue(
                    OutboxPublisher.USER_ROLE_CHANGED,
                    user.getId(),
                    new UserRoleChangedEvent(user.getId().toString(), AppRole.ROLE_ADMIN.value(), "ASSIGNED")
            );
        }

        AdminSubscription sub = subscriptionRepository.findByUser(user)
                .orElse(AdminSubscription.builder().user(user).build());

        Instant base = (sub.getExpiresAt() != null && sub.getExpiresAt().isAfter(Instant.now()))
                ? sub.getExpiresAt()
                : Instant.now();

        sub.setExpiresAt(base.plus(30, ChronoUnit.DAYS));
        sub.setActive(true);
        sub.setPaymentId(payment.getPaymentId());
        subscriptionRepository.save(sub);

        payment.setEntitlementApplied(true);
        payment.setStatus(STATUS_SUCCEEDED);
        paymentRepository.save(payment);
        bumpTokenVersion(user);
    }

    private boolean assignAdminRoleIfNeeded(User user) {
        UUID userId = user.getId();
        if (roleRepository.existsByUserIdAndRoleAndActiveTrue(userId, AppRole.ROLE_ADMIN.value())) {
            return false;
        }

        UserRole userRole = roleRepository.findByUserIdAndRoleAndActiveFalse(userId, AppRole.ROLE_ADMIN.value())
                .map(this::reactivateAdminRole)
                .orElseGet(() -> UserRole.builder()
                        .user(user)
                        .role(AppRole.ROLE_ADMIN.value())
                        .assignedByUserId(null)
                        .build());

        try {
            roleRepository.save(userRole);
            return true;
        } catch (DataIntegrityViolationException ex) {
            log.info("Admin role assignment raced for userId={}, duplicate resolved by constraint", userId);
            return false;
        }
    }

    private UserRole reactivateAdminRole(UserRole userRole) {
        userRole.setActive(true);
        userRole.setAssignedAt(Instant.now());
        userRole.setAssignedByUserId(null);
        userRole.setRevokedAt(null);
        userRole.setRevokedByUserId(null);
        return userRole;
    }

    private String sha256(String rawBody) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawBody.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to hash webhook payload", e);
        }
    }

    public record PaymentSession(String paymentId, String confirmationUrl, boolean renewal) {
    }

    private void bumpTokenVersion(User user) {
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);
    }
}
