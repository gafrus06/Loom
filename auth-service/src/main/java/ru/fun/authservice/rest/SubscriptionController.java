package ru.fun.authservice.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import ru.fun.authservice.entity.AdminSubscription;
import ru.fun.authservice.security.GatewayUserPrincipal;
import ru.fun.authservice.service.SubscriptionService;

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

    private static final String WEBHOOK_TOKEN_HEADER = "X-Webhook-Token";

    private final SubscriptionService subscriptionService;
    private final ObjectMapper objectMapper;

    @Value("${yookassa.webhook-token:${YOOKASSA_WEBHOOK_TOKEN:}}")
    private String webhookToken;

    @PostMapping("/pay")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> pay(@AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        SubscriptionService.PaymentSession session = subscriptionService.createPayment(currentUser.getUserId());
        return ResponseEntity.ok(Map.of(
                "paymentId", session.paymentId(),
                "confirmationUrl", session.confirmationUrl() == null ? "" : session.confirmationUrl(),
                "type", session.renewal() ? "renewal" : "new"
        ));
    }

    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> status(@AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        UUID userId = currentUser.getUserId();
        Optional<AdminSubscription> sub = subscriptionService.getSubscription(userId);

        if (sub.isEmpty() || !sub.get().isActive() || sub.get().getExpiresAt().isBefore(Instant.now())) {
            return ResponseEntity.ok(Map.of("active", false));
        }

        Instant exp = sub.get().getExpiresAt();
        boolean tokenRefreshRequired = currentUser.getAuthorities().stream()
                .noneMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));

        return ResponseEntity.ok(Map.of(
                "active", true,
                "expiresAt", exp.toString(),
                "daysLeft", Duration.between(Instant.now(), exp).toDays(),
                "tokenRefreshRequired", tokenRefreshRequired
        ));
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody String rawBody,
            @RequestHeader(value = WEBHOOK_TOKEN_HEADER, required = false) String providedToken) {
        validateWebhookToken(providedToken);

        try {
            JsonNode root = objectMapper.readTree(rawBody);
            String event = root.path("event").asText("");
            JsonNode obj = root.path("object");
            String status = obj.path("status").asText("");
            String paymentId = obj.path("id").asText("");
            String userIdStr = obj.path("metadata").path("userId").asText(null);

            if (paymentId.isBlank() || userIdStr == null || userIdStr.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Webhook payload is missing payment metadata");
            }

            UUID userId = UUID.fromString(userIdStr.trim());
            subscriptionService.processWebhook(rawBody, event, paymentId, status, userId);
            return ResponseEntity.ok().build();
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception e) {
            log.error("Webhook processing failed", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Webhook processing failed");
        }
    }

    private void validateWebhookToken(String providedToken) {
        if (webhookToken == null || webhookToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Webhook token is not configured");
        }
        if (!webhookToken.equals(providedToken)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
    }
}
