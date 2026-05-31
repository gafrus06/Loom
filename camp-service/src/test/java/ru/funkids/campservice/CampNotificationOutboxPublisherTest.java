package ru.funkids.campservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.funkids.campservice.client.NotificationServiceClient;
import ru.funkids.campservice.client.dto.NotificationCreateRequest;
import ru.funkids.campservice.entity.CampNotificationOutboxEvent;
import ru.funkids.campservice.repository.CampNotificationOutboxRepository;
import ru.funkids.campservice.service.impl.CampNotificationOutboxPublisher;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CampNotificationOutboxPublisherTest {

    @Mock
    private CampNotificationOutboxRepository repository;

    @Mock
    private NotificationServiceClient notificationServiceClient;

    private CampNotificationOutboxPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new CampNotificationOutboxPublisher(repository, notificationServiceClient, new ObjectMapper());
        ReflectionTestUtils.setField(publisher, "batchSize", 10);
    }

    @Test
    void publishPendingMarksPublishedAndPersistsBatch() throws Exception {
        CampNotificationOutboxEvent event = CampNotificationOutboxEvent.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .type("CAMP_JOB_INVITATION")
                .title("Приглашение")
                .body("Тест")
                .entityType("SESSION_ASSIGNMENT")
                .entityId(UUID.randomUUID())
                .metadataJson(new ObjectMapper().writeValueAsString(Map.of("assignmentId", "a1")))
                .build();
        when(repository.lockNextBatch(10)).thenReturn(List.of(event));

        publisher.publishPending();

        assertNotNull(event.getPublishedAt());
        assertNull(event.getLastError());
        verify(repository).saveAll(List.of(event));
        verify(notificationServiceClient).createInternalNotification(any(NotificationCreateRequest.class));
    }

    @Test
    void publishPendingStoresErrorAndPersistsBatchOnFailure() throws Exception {
        CampNotificationOutboxEvent event = CampNotificationOutboxEvent.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .type("CAMP_JOB_INVITATION")
                .title("Приглашение")
                .body("Тест")
                .entityType("SESSION_ASSIGNMENT")
                .entityId(UUID.randomUUID())
                .metadataJson(new ObjectMapper().writeValueAsString(Map.of("assignmentId", "a1")))
                .build();
        when(repository.lockNextBatch(10)).thenReturn(List.of(event));
        doThrow(new RuntimeException("notification down"))
                .when(notificationServiceClient).createInternalNotification(any(NotificationCreateRequest.class));

        publisher.publishPending();

        assertNull(event.getPublishedAt());
        verify(repository).saveAll(List.of(event));
    }
}
