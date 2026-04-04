package ru.fun.authservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import ru.fun.authservice.rest.SubscriptionController;
import ru.fun.authservice.service.SubscriptionService;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class SubscriptionControllerTest {

    private final SubscriptionService subscriptionService = mock(SubscriptionService.class);
    private final SubscriptionController controller =
            new SubscriptionController(subscriptionService, new ObjectMapper());

    SubscriptionControllerTest() {
        ReflectionTestUtils.setField(controller, "webhookToken", "token-123");
    }

    @Test
    void rejectsWebhookWithoutConfiguredTokenHeader() {
        assertThatThrownBy(() -> controller.webhook("""
                {"event":"payment.succeeded","object":{"id":"pay-1","status":"succeeded","metadata":{"userId":"00000000-0000-0000-0000-000000000001"}}}
                """, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403 FORBIDDEN");
    }

    @Test
    void processesSignedWebhook() {
        controller.webhook("""
                {"event":"payment.succeeded","object":{"id":"pay-1","status":"succeeded","metadata":{"userId":"00000000-0000-0000-0000-000000000001"}}}
                """, "token-123");

        verify(subscriptionService).processWebhook(any(), eq("payment.succeeded"), eq("pay-1"), eq("succeeded"),
                eq(UUID.fromString("00000000-0000-0000-0000-000000000001")));
    }
}
