package ru.funkids.campservice.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.client.NotificationServiceClient;
import ru.funkids.campservice.client.dto.NotificationCreateRequest;
import ru.funkids.campservice.entity.CampNotificationOutboxEvent;
import ru.funkids.campservice.repository.CampNotificationOutboxRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class CampNotificationOutboxPublisher {

    private static final TypeReference<Map<String, String>> STRING_MAP_TYPE = new TypeReference<>() {};

    private final CampNotificationOutboxRepository repository;
    private final NotificationServiceClient notificationServiceClient;
    private final ObjectMapper objectMapper;

    @Value("${camp.notifications.outbox.batch-size:50}")
    private int batchSize;

    @Value("${camp.outbox.retention-days:14}")
    private long retentionDays;

    @Scheduled(fixedDelayString = "${camp.notifications.outbox.fixed-delay-ms:3000}")
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
        List<CampNotificationOutboxEvent> batch = repository.lockNextBatch(batchSize);
        for (CampNotificationOutboxEvent event : batch) {
            try {
                notificationServiceClient.createInternalNotification(NotificationCreateRequest.builder()
                        .userId(event.getUserId())
                        .type(event.getType())
                        .title(event.getTitle())
                        .body(event.getBody())
                        .entityType(event.getEntityType())
                        .entityId(event.getEntityId())
                        .metadata(readMetadata(event.getMetadataJson()))
                        .build());
                event.setPublishedAt(OffsetDateTime.now());
                event.setLastError(null);
            } catch (Exception ex) {
                event.setLastError(ex.getMessage());
                log.error("Failed to publish camp notification outbox event {}", event.getId(), ex);
            }
        }
        if (!batch.isEmpty()) {
            repository.saveAll(batch);
        }
    }

    private Map<String, String> readMetadata(String metadataJson) throws Exception {
        if (metadataJson == null || metadataJson.isBlank()) {
            return Map.of();
        }
        return objectMapper.readValue(metadataJson, STRING_MAP_TYPE);
    }
}
