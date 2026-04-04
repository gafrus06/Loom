package ru.funkids.notificationservice.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import ru.funkids.notificationservice.dto.PhoneVerificationStartEvent;
import ru.funkids.notificationservice.entity.ProcessedInboundEvent;
import ru.funkids.notificationservice.repository.ProcessedInboundEventRepository;
import ru.funkids.notificationservice.service.OtpService;

@Slf4j
@Component
@RequiredArgsConstructor
public class PhoneVerificationListener {

    private static final String SOURCE_TOPIC = "user.phone.verification.start";

    private final ObjectMapper objectMapper;
    private final OtpService otpService;
    private final ProcessedInboundEventRepository processedInboundEventRepository;

    @KafkaListener(
            topics = "${topics.phoneVerificationStart}",
            groupId = "${kafka.consumer.group-id}",
            containerFactory = "stringKafkaListenerContainerFactory"
    )
    public void onStart(String json) {
        PhoneVerificationStartEvent event = parse(json);
        if (alreadyProcessed(event.getEventId())) {
            log.info("Skipping duplicate phone verification event {}", event.getEventId());
            return;
        }
        log.info("Phone verification start for user={} phone={}", event.getUserId(), event.getPhone());
        otpService.createAndSend(event.getUserId(), event.getPhone());
        markProcessed(event.getEventId(), SOURCE_TOPIC);
    }

    private PhoneVerificationStartEvent parse(String json) {
        try {
            return objectMapper.readValue(json, PhoneVerificationStartEvent.class);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to deserialize phone verification start event", ex);
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
