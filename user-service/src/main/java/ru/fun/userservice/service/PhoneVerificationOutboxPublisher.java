package ru.fun.userservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fun.userservice.dto.notification.PhoneVerificationStartEvent;
import ru.fun.userservice.entity.PhoneVerificationOutboxEvent;
import ru.fun.userservice.kafka.NotificationEventPublisher;
import ru.fun.userservice.repository.PhoneVerificationOutboxRepository;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PhoneVerificationOutboxPublisher {

    private final PhoneVerificationOutboxRepository repository;
    private final NotificationEventPublisher publisher;
    private final ObjectMapper objectMapper;

    @Value("${app.phone-verification-outbox.batch-size:50}")
    private int batchSize;

    @Value("${app.phone-verification-outbox.retention-days:14}")
    private long retentionDays;

    @Scheduled(fixedDelayString = "${app.phone-verification-outbox.fixed-delay-ms:3000}")
    public void publishScheduled() {
        publishPending();
    }

    @Scheduled(fixedDelayString = "${app.phone-verification-outbox.cleanup.fixed-delay-ms:3600000}")
    @Transactional
    public void cleanupPublished() {
        repository.deleteAll(repository.findByPublishedAtBefore(Instant.now().minusSeconds(retentionDays * 86_400)));
    }

    @Transactional
    public void publishPending() {
        List<PhoneVerificationOutboxEvent> batch = repository.lockNextBatch(batchSize);
        for (PhoneVerificationOutboxEvent event : batch) {
            try {
                publisher.publish(objectMapper.readValue(event.getPayloadJson(), PhoneVerificationStartEvent.class));
                event.setPublishedAt(Instant.now());
                event.setLastError(null);
            } catch (Exception ex) {
                event.setLastError(ex.getMessage());
                log.error("Failed to publish phone verification outbox event {}", event.getId(), ex);
            }
        }
    }
}
