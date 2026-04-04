package ru.fun.authservice.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

/**
 * Сервис для работы с YooKassa API.
 *
 * Идемпотентный ключ приходит снаружи из слоя subscription/payment ledger.
 */
@Service
@Slf4j
public class YooKassaService {

    @Value("${yookassa.shop-id}")
    private String shopId;

    @Value("${yookassa.secret-key}")
    private String secretKey;

    @Value("${yookassa.return-url}")
    private String returnUrl;

    @Value("${yookassa.amount:4999.00}")
    private String amount;

    @Value("${yookassa.currency:RUB}")
    private String currency;

    private static final String API_URL = "https://api.yookassa.ru/v3/payments";
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final WebClient webClient;

    public YooKassaService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl(API_URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Создаёт платёж в YooKassa.
     *
     * @param userId    идентификатор пользователя
     * @param isRenewal true — продление существующей подписки, false — первая покупка.
     *                  Разные ключи гарантируют что оба платежа можно создать в один день.
     */
    public PaymentResult createPayment(UUID userId, boolean isRenewal, String requestKey) {
        String description = isRenewal
                ? "Продление подписки Администратор — 30 дней"
                : "Подписка Администратор — 30 дней";

        Map<String, Object> body = Map.of(
                "amount",       Map.of("value", amount, "currency", currency),
                "capture",      true,
                "confirmation", Map.of(
                        "type",       "redirect",
                        "return_url", returnUrl + "?payment=success&userId=" + userId
                ),
                "description", description,
                "metadata",    Map.of("userId", userId.toString())
        );

        return webClient.post()
                .header("Authorization", "Basic " + basicAuth())
                .header("Idempotence-Key", requestKey)
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, response ->
                        response.bodyToMono(String.class)
                                .flatMap(err -> Mono.error(
                                        new YooKassaException("YooKassa client error: " + err, true)
                                ))
                )
                .onStatus(HttpStatusCode::is5xxServerError, response ->
                        response.bodyToMono(String.class)
                                .flatMap(err -> Mono.error(
                                        new YooKassaException("YooKassa server error: " + err, false)
                                ))
                )
                .bodyToMono(PaymentResponse.class)
                .timeout(TIMEOUT)
                .retryWhen(Retry.backoff(3, Duration.ofSeconds(1))
                        .maxBackoff(Duration.ofSeconds(8))
                        .filter(ex -> !(ex instanceof YooKassaException yex && yex.isClientError()))
                        .onRetryExhaustedThrow((spec, signal) ->
                                new YooKassaException("YooKassa unavailable after retries", false))
                )
                .map(pr -> {
                    log.info("Payment response: id={}, status={}, hasConfirmation={}, isRenewal={}",
                            pr.getId(), pr.getStatus(), pr.getConfirmation() != null, isRenewal);

                    // ✅ 1. Если уже оплачен — сразу успех
                    if ("succeeded".equals(pr.getStatus())) {
                        log.info("Payment {} already succeeded (no redirect needed)", pr.getId());
                        return new PaymentResult(pr.getId(), null);
                    }

                    // ✅ 2. Если есть URL — отдаём его
                    if (pr.getConfirmation() != null &&
                            pr.getConfirmation().getConfirmationUrl() != null) {

                        log.info("Payment created: {} for user {}", pr.getId(), userId);
                        return new PaymentResult(
                                pr.getId(),
                                pr.getConfirmation().getConfirmationUrl()
                        );
                    }

                    // ❌ 3. Только реально странный случай
                    throw new YooKassaException(
                            "Unexpected payment state: id=" + pr.getId()
                                    + ", status=" + pr.getStatus(),
                            true
                    );
                })
                .block();
    }

    private String basicAuth() {
        return Base64.getEncoder()
                .encodeToString((shopId + ":" + secretKey).getBytes(StandardCharsets.UTF_8));
    }

    // ── DTOs ────────────────────────────────────────────────────────────

    public record PaymentResult(String paymentId, String confirmationUrl) {}

    @Data
    public static class PaymentResponse {
        private String id;
        private String status;
        private Confirmation confirmation;

        @Data
        public static class Confirmation {
            @JsonProperty("confirmation_url")
            private String confirmationUrl;
        }
    }

    @Data
    public static class WebhookEvent {
        private String type;
        private WebhookObject object;

        @Data
        public static class WebhookObject {
            private String id;
            private String status;
            private Metadata metadata;

            @Data
            public static class Metadata {
                @JsonProperty("userId")
                private String userId;
            }
        }
    }

    public static class YooKassaException extends RuntimeException {

        private final boolean clientError;

        public YooKassaException(String message, boolean clientError) {
            super(message);
            this.clientError = clientError;
        }

        public boolean isClientError() {
            return clientError;
        }
    }
}
