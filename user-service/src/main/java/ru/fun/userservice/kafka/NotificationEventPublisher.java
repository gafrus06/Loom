package ru.fun.userservice.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import ru.fun.userservice.dto.notification.PhoneVerificationStartEvent;

/**
 * Было: new ObjectMapper() — создавал отдельный экземпляр без кастомных настроек (модули, etc.)
 * Стало: инжектируем бин ObjectMapper из контекста Spring.
 */
@Component
@RequiredArgsConstructor
public class NotificationEventPublisher {

    private final KafkaTemplate<String, String> kafka;
    private final ObjectMapper objectMapper;

    @Value("${topics.phoneVerificationStart:user.phone.verification.start}")
    private String topic;

    public void publish(PhoneVerificationStartEvent evt) {
        try {
            kafka.send(topic, evt.getUserId().toString(), objectMapper.writeValueAsString(evt));
        } catch (Exception e) {
            throw new RuntimeException("Failed to publish phone verification start event", e);
        }
    }
}