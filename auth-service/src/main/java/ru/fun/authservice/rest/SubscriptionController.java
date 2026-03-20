package ru.fun.authservice.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.fun.authservice.entity.AdminSubscription;
import ru.fun.authservice.security.GatewayUserPrincipal;
import ru.fun.authservice.service.SubscriptionService;
import ru.fun.authservice.service.YooKassaService;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth/subscription")
@RequiredArgsConstructor
@Slf4j
public class SubscriptionController {

    private final YooKassaService yooKassaService;
    private final SubscriptionService subscriptionService;
    private final ObjectMapper objectMapper;

    /**
     * Создаёт платёж на покупку или продление подписки.
     *
     * Автоматически определяет тип:
     * - нет активной подписки → первая покупка (ключ: payment-{userId}-{date})
     * - есть активная подписка → продление (ключ: payment-renew-{userId}-{date})
     *
     * Разные ключи гарантируют что оба платежа можно провести в один день.
     */
    @PostMapping("/pay")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> pay(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser
    ) {
        UUID userId = currentUser.getUserId();

        Optional<AdminSubscription> existing = subscriptionService.getSubscription(userId);
        boolean isRenewal = existing.isPresent()
                && existing.get().isActive()
                && existing.get().getExpiresAt().isAfter(Instant.now());

        log.info("Payment request for userId={}, isRenewal={}", userId, isRenewal);

        YooKassaService.PaymentResult result = yooKassaService.createPayment(userId, isRenewal);

        return ResponseEntity.ok(Map.of(
                "paymentId",       result.paymentId(),
                "confirmationUrl", result.confirmationUrl(),
                "type",            isRenewal ? "renewal" : "new"
        ));
    }

    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> status(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser
    ) {
        UUID userId = currentUser.getUserId();
        Optional<AdminSubscription> sub = subscriptionService.getSubscription(userId);

        if (sub.isEmpty() || !sub.get().isActive() || sub.get().getExpiresAt().isBefore(Instant.now())) {
            return ResponseEntity.ok(Map.of("active", false));
        }

        Instant exp = sub.get().getExpiresAt();
        return ResponseEntity.ok(Map.of(
                "active",    true,
                "expiresAt", exp.toString(),
                "daysLeft",  Duration.between(Instant.now(), exp).toDays()
        ));
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody String rawBody) {
        log.info("=== YooKassa webhook received ===");
        log.info("Body: {}", rawBody);

        try {
            JsonNode root    = objectMapper.readTree(rawBody);
            String event     = root.path("event").asText("");
            log.info("event={}", event);

            if (!"payment.succeeded".equals(event)) {
                log.info("Ignoring event: {}", event);
                return ResponseEntity.ok().build();
            }

            JsonNode obj     = root.path("object");
            String status    = obj.path("status").asText("");
            String paymentId = obj.path("id").asText("");
            log.info("paymentId={} status={}", paymentId, status);

            if (!"succeeded".equals(status)) {
                return ResponseEntity.ok().build();
            }

            String userIdStr = obj.path("metadata").path("userId").asText(null);
            log.info("metadata.userId={}", userIdStr);

            if (userIdStr == null || userIdStr.isBlank()) {
                log.warn("No userId in metadata, paymentId={}", paymentId);
                return ResponseEntity.ok().build();
            }

            UUID userId = UUID.fromString(userIdStr.trim());
            subscriptionService.activateAdminSubscription(userId, paymentId);
            log.info("SUCCESS: subscription activated for userId={}", userId);

        } catch (Exception e) {
            log.error("Webhook error: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok().build();
    }
}