package ru.funkids.notificationservice;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import ru.funkids.notificationservice.entity.DeadLetterEvent;
import ru.funkids.notificationservice.repository.DeadLetterEventRepository;
import ru.funkids.notificationservice.service.DeadLetterOperationsService;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeadLetterOperationsServiceTest {

    @Mock
    private DeadLetterEventRepository repository;

    @Mock
    private KafkaTemplate<String, String> replayKafkaTemplate;

    @InjectMocks
    private DeadLetterOperationsService service;

    @Test
    void replayPublishesOriginalPayloadAndMarksEventAsReplayed() {
        UUID id = UUID.randomUUID();
        DeadLetterEvent event = DeadLetterEvent.builder()
                .id(id)
                .serviceName("notification-service")
                .originalTopic("user.phone.verification.start")
                .dltTopic("user.phone.verification.start.DLT")
                .messageKey("user-1")
                .payload("{\"value\":1}")
                .build();
        when(repository.findById(id)).thenReturn(Optional.of(event));

        service.replay(id);

        verify(replayKafkaTemplate).send("user.phone.verification.start", "user-1", "{\"value\":1}");
        assertNotNull(event.getReplayedAt());
    }

    @Test
    void storePersistsDeadLetterRecord() {
        service.store(
                "notification-service",
                "topic.a",
                "topic.a.DLT",
                "key-1",
                "{\"hello\":\"world\"}",
                "java.lang.RuntimeException",
                "boom"
        );

        ArgumentCaptor<DeadLetterEvent> captor = ArgumentCaptor.forClass(DeadLetterEvent.class);
        verify(repository).save(captor.capture());
        DeadLetterEvent saved = captor.getValue();
        assertEquals("notification-service", saved.getServiceName());
        assertEquals("topic.a", saved.getOriginalTopic());
        assertEquals("topic.a.DLT", saved.getDltTopic());
        assertEquals("key-1", saved.getMessageKey());
        assertEquals("{\"hello\":\"world\"}", saved.getPayload());
    }
}
