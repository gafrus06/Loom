package ru.fun.authservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.fun.authservice.dto.UserRegisteredEvent;
import ru.fun.authservice.entity.OutboxEvent;
import ru.fun.authservice.kafka.UserEventProducer;
import ru.fun.authservice.repository.OutboxEventRepository;
import ru.fun.authservice.service.OutboxPublisher;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OutboxPublisherTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private UserEventProducer userEventProducer;

    private ObjectMapper objectMapper;

    private OutboxPublisher outboxPublisher;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        outboxPublisher = new OutboxPublisher(outboxEventRepository, userEventProducer, objectMapper);
        ReflectionTestUtils.setField(outboxPublisher, "batchSize", 10);
    }

    @Test
    void publishPendingMarksEventAsPublishedOnSuccess() throws Exception {
        OutboxEvent event = OutboxEvent.builder()
                .id(UUID.randomUUID())
                .eventType(OutboxPublisher.USER_REGISTERED)
                .aggregateId(UUID.randomUUID())
                .payloadJson(objectMapper.writeValueAsString(new UserRegisteredEvent("u1", "a@b.c", "ROLE_USER")))
                .build();
        when(outboxEventRepository.lockNextBatch(10)).thenReturn(List.of(event));

        outboxPublisher.publishPending();

        assertNotNull(event.getPublishedAt());
        assertNull(event.getLastError());
        verify(userEventProducer).publishUserRegistered(any(UserRegisteredEvent.class));
    }

    @Test
    void publishPendingStoresErrorAndKeepsEventPendingOnFailure() throws Exception {
        OutboxEvent event = OutboxEvent.builder()
                .id(UUID.randomUUID())
                .eventType(OutboxPublisher.USER_REGISTERED)
                .aggregateId(UUID.randomUUID())
                .payloadJson(objectMapper.writeValueAsString(new UserRegisteredEvent("u1", "a@b.c", "ROLE_USER")))
                .build();
        when(outboxEventRepository.lockNextBatch(10)).thenReturn(List.of(event));
        doThrow(new RuntimeException("kafka down")).when(userEventProducer).publishUserRegistered(any());

        outboxPublisher.publishPending();

        assertNull(event.getPublishedAt());
        assertEquals("kafka down", event.getLastError());
    }
}
