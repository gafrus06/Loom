package ru.funkids.campservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.funkids.campservice.client.AuthServiceInternalClient;
import ru.funkids.campservice.entity.CampAuthOutboxEvent;
import ru.funkids.campservice.repository.CampAuthOutboxRepository;
import ru.funkids.campservice.service.impl.CampAuthOutboxPublisher;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CampAuthOutboxPublisherTest {

    @Mock
    private CampAuthOutboxRepository repository;

    @Mock
    private AuthServiceInternalClient authServiceInternalClient;

    private CampAuthOutboxPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new CampAuthOutboxPublisher(repository, authServiceInternalClient);
        ReflectionTestUtils.setField(publisher, "batchSize", 10);
    }

    @Test
    void publishPendingMarksEventAsPublishedOnSuccess() {
        UUID userId = UUID.randomUUID();
        CampAuthOutboxEvent event = CampAuthOutboxEvent.builder()
                .id(UUID.randomUUID())
                .userId(userId)
                .role("ROLE_PARENT")
                .build();
        when(repository.lockNextBatch(10)).thenReturn(List.of(event));

        publisher.publishPending();

        assertNotNull(event.getPublishedAt());
        assertNull(event.getLastError());
        verify(authServiceInternalClient).assignRole(Map.of(
                "userId", userId.toString(),
                "role", "ROLE_PARENT"
        ));
    }

    @Test
    void publishPendingStoresErrorAndKeepsEventPendingOnFailure() {
        CampAuthOutboxEvent event = CampAuthOutboxEvent.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .role("ROLE_PARENT")
                .build();
        when(repository.lockNextBatch(10)).thenReturn(List.of(event));
        doThrow(new RuntimeException("auth down")).when(authServiceInternalClient).assignRole(Map.of(
                "userId", event.getUserId().toString(),
                "role", event.getRole()
        ));

        publisher.publishPending();

        assertNull(event.getPublishedAt());
        assertTrue(event.getLastError().contains("auth down"));
    }
}
