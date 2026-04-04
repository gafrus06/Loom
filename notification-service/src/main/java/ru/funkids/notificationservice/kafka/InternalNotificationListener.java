package ru.funkids.notificationservice.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import ru.funkids.notificationservice.dto.NotificationRequestedEvent;
import ru.funkids.notificationservice.entity.ProcessedInboundEvent;
import ru.funkids.notificationservice.repository.ProcessedInboundEventRepository;
import ru.funkids.notificationservice.service.NotificationService;

@Component
@RequiredArgsConstructor
@Slf4j
public class InternalNotificationListener {

    private static final String SOURCE_TOPIC = "notification.internal.requested";

    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;
    private final ProcessedInboundEventRepository processedInboundEventRepository;

    @KafkaListener(
            topics = "${topics.internalNotificationRequested}",
            groupId = "${kafka.consumer.group-id}",
            containerFactory = "stringKafkaListenerContainerFactory"
    )
    public void onInternalNotification(String json) {
        NotificationRequestedEvent event = parse(json);
        if (alreadyProcessed(event.getEventId())) {
            log.info("Skipping duplicate internal notification event {}", event.getEventId());
            return;
        }
        notificationService.store(event);
        markProcessed(event.getEventId(), SOURCE_TOPIC);
        log.info("Stored notification {} for user {}", event.getNotificationId(), event.getUserId());
    }

    private NotificationRequestedEvent parse(String json) {
        try {
            return objectMapper.readValue(json, NotificationRequestedEvent.class);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to deserialize internal notification event", ex);
        }
    }

    private boolean alreadyProcessed(java.util.UUID eventId) {
        return eventId != null && processedInboundEventRepository.existsById(eventId);
    }

    private void markProcessed(java.util.UUID eventId, String topic) {
        if (eventId == null) {
            return;
        }
        processedInboundEventRepository.save(ProcessedInboundEvent.builder()
                .eventId(eventId)
                .sourceTopic(topic)
                .build());
    }
}
