package ru.fun.userservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.fun.userservice.dto.notification.PhoneVerificationStartEvent;
import ru.fun.userservice.entity.PhoneVerificationOutboxEvent;
import ru.fun.userservice.kafka.NotificationEventPublisher;
import ru.fun.userservice.repository.PhoneVerificationOutboxRepository;
import ru.fun.userservice.service.PhoneVerificationOutboxPublisher;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PhoneVerificationOutboxPublisherTest {

    @Mock
    private PhoneVerificationOutboxRepository repository;

    @Mock
    private NotificationEventPublisher publisher;

    private PhoneVerificationOutboxPublisher outboxPublisher;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        outboxPublisher = new PhoneVerificationOutboxPublisher(repository, publisher, objectMapper);
        ReflectionTestUtils.setField(outboxPublisher, "batchSize", 10);
    }

    @Test
    void publishPendingMarksPublishedAndPersistsBatch() throws Exception {
        PhoneVerificationStartEvent payload = new PhoneVerificationStartEvent();
        payload.setEventId(UUID.randomUUID());
        payload.setUserId(UUID.randomUUID());
        payload.setPhone("+70000000000");
        PhoneVerificationOutboxEvent event = PhoneVerificationOutboxEvent.builder()
                .id(UUID.randomUUID())
                .payloadJson("""
                        {"eventId":"%s","userId":"%s","phone":"+70000000000","correlationId":"%s","occurredAt":"2026-01-01T00:00:00Z","version":1}
                        """.formatted(payload.getEventId(), payload.getUserId(), payload.getCorrelationId()).replace("\r", "").replace("\n", ""))
                .build();
        when(repository.lockNextBatch(10)).thenReturn(List.of(event));

        outboxPublisher.publishPending();

        assertNotNull(event.getPublishedAt());
        assertNull(event.getLastError());
        verify(repository).saveAll(List.of(event));
        verify(publisher).publish(any(PhoneVerificationStartEvent.class));
    }

    @Test
    void publishPendingStoresErrorAndPersistsBatchOnFailure() throws Exception {
        PhoneVerificationStartEvent payload = new PhoneVerificationStartEvent();
        payload.setEventId(UUID.randomUUID());
        payload.setUserId(UUID.randomUUID());
        payload.setPhone("+70000000000");
        PhoneVerificationOutboxEvent event = PhoneVerificationOutboxEvent.builder()
                .id(UUID.randomUUID())
                .payloadJson("""
                        {"eventId":"%s","userId":"%s","phone":"+70000000000","correlationId":"%s","occurredAt":"2026-01-01T00:00:00Z","version":1}
                        """.formatted(payload.getEventId(), payload.getUserId(), payload.getCorrelationId()).replace("\r", "").replace("\n", ""))
                .build();
        when(repository.lockNextBatch(10)).thenReturn(List.of(event));
        doThrow(new RuntimeException("broker down")).when(publisher).publish(any(PhoneVerificationStartEvent.class));

        outboxPublisher.publishPending();

        assertNull(event.getPublishedAt());
        verify(repository).saveAll(List.of(event));
    }
}
