package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.client.AuthServiceInternalClient;
import ru.funkids.campservice.entity.CampAuthOutboxEvent;
import ru.funkids.campservice.repository.CampAuthOutboxRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class CampAuthOutboxPublisher {

    private final CampAuthOutboxRepository repository;
    private final AuthServiceInternalClient authServiceInternalClient;

    @Value("${camp.auth-outbox.batch-size:50}")
    private int batchSize;

    @Value("${camp.outbox.retention-days:14}")
    private long retentionDays;

    @Scheduled(fixedDelayString = "${camp.auth-outbox.fixed-delay-ms:3000}")
    public void publishScheduled() {
        publishPending();
    }

    @Scheduled(fixedDelayString = "${camp.outbox.cleanup.fixed-delay-ms:3600000}")
    @Transactional
    public void cleanupPublished() {
        repository.deleteAll(repository.findByPublishedAtBefore(OffsetDateTime.now().minusDays(retentionDays)));
    }

    @Transactional
    public void publishPending() {
        List<CampAuthOutboxEvent> batch = repository.lockNextBatch(batchSize);
        for (CampAuthOutboxEvent event : batch) {
            try {
                authServiceInternalClient.assignRole(Map.of(
                        "userId", event.getUserId().toString(),
                        "role", event.getRole()
                ));
                event.setPublishedAt(OffsetDateTime.now());
                event.setLastError(null);
            } catch (Exception ex) {
                event.setLastError(ex.getMessage());
                log.error("Failed to publish camp auth outbox event {}", event.getId(), ex);
            }
        }
    }
}
