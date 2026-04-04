package ru.funkids.notificationservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import ru.funkids.notificationservice.dto.NotificationRequestedEvent;

@Component
@RequiredArgsConstructor
public class InternalNotificationPublisher {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    @Value("${topics.internalNotificationRequested}")
    private String topic;

    public void publish(NotificationRequestedEvent event) {
        try {
            kafkaTemplate.send(topic, event.getUserId().toString(), objectMapper.writeValueAsString(event));
        } catch (Exception ex) {
            throw new RuntimeException("Failed to publish internal notification event", ex);
        }
    }
}
