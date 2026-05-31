package ru.fun.authservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fun.authservice.dto.UserRegisteredEvent;
import ru.fun.authservice.dto.UserRoleChangedEvent;
import ru.fun.authservice.entity.OutboxEvent;
import ru.fun.authservice.kafka.UserEventProducer;
import ru.fun.authservice.repository.OutboxEventRepository;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(prefix = "app.outbox", name = "enabled", havingValue = "true", matchIfMissing = true)
public class OutboxPublisher {

    public static final String USER_REGISTERED = "USER_REGISTERED";
    public static final String USER_ROLE_CHANGED = "USER_ROLE_CHANGED";

    private final OutboxEventRepository outboxEventRepository;
    private final UserEventProducer userEventProducer;
    private final ObjectMapper objectMapper;

    @Value("${app.outbox.batch-size:50}")
    private int batchSize;

    @Value("${app.outbox.retention-days:14}")
    private long retentionDays;

    @Scheduled(fixedDelayString = "${app.outbox.fixed-delay-ms:2000}")
    @Transactional
    public void publishScheduled() {
        publishPending();
    }

    @Scheduled(fixedDelayString = "${app.outbox.cleanup.fixed-delay-ms:3600000}")
    @Transactional
    public void cleanupPublished() {
        outboxEventRepository.deleteAll(outboxEventRepository.findByPublishedAtBefore(Instant.now().minusSeconds(retentionDays * 86_400)));
    }

    @Transactional
    public void publishPending() {
        List<OutboxEvent> batch = outboxEventRepository.lockNextBatch(batchSize);
        for (OutboxEvent event : batch) {
            try {
                switch (event.getEventType()) {
                    case USER_REGISTERED -> userEventProducer.publishUserRegistered(
                            objectMapper.readValue(event.getPayloadJson(), UserRegisteredEvent.class));
                    case USER_ROLE_CHANGED -> userEventProducer.publishUserRoleChanged(
                            objectMapper.readValue(event.getPayloadJson(), UserRoleChangedEvent.class));
                    default -> throw new IllegalStateException("Unsupported outbox event type: " + event.getEventType());
                }
                event.setPublishedAt(Instant.now());
                event.setLastError(null);
            } catch (Exception ex) {
                event.setLastError(ex.getMessage());
                log.error("Failed to publish outbox event id={} type={}", event.getId(), event.getEventType(), ex);
            }
        }
    }
}
