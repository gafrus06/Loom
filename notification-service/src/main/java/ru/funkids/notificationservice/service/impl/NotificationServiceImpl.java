package ru.funkids.notificationservice.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ru.funkids.notificationservice.dto.NotificationCreateRequest;
import ru.funkids.notificationservice.dto.NotificationQueuedResponse;
import ru.funkids.notificationservice.dto.NotificationRequestedEvent;
import ru.funkids.notificationservice.dto.NotificationResponse;
import ru.funkids.notificationservice.entity.NotificationRecord;
import ru.funkids.notificationservice.repository.NotificationRepository;
import ru.funkids.notificationservice.service.NotificationService;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private static final TypeReference<Map<String, String>> STRING_MAP_TYPE = new TypeReference<>() {};

    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    @Override
    public NotificationQueuedResponse enqueue(NotificationCreateRequest request) {
        NotificationRequestedEvent event = NotificationRequestedEvent.builder()
                .notificationId(UUID.randomUUID())
                .userId(request.getUserId())
                .type(request.getType())
                .title(request.getTitle())
                .body(request.getBody())
                .entityType(request.getEntityType())
                .entityId(request.getEntityId())
                .metadata(request.getMetadata())
                .createdAt(OffsetDateTime.now())
                .eventId(UUID.randomUUID())
                .correlationId(UUID.randomUUID())
                .version(1)
                .build();

        store(event);
        return NotificationQueuedResponse.builder()
                .notificationId(event.getNotificationId())
                .status("QUEUED")
                .build();
    }

    @Override
    public void store(NotificationRequestedEvent event) {
        if (notificationRepository.existsById(event.getNotificationId())) {
            log.info("Notification {} already stored, skipping duplicate Kafka delivery", event.getNotificationId());
            return;
        }

        notificationRepository.save(NotificationRecord.builder()
                .id(event.getNotificationId())
                .userId(event.getUserId())
                .type(event.getType())
                .title(event.getTitle())
                .body(event.getBody())
                .entityType(event.getEntityType())
                .entityId(event.getEntityId())
                .metadataJson(writeMetadata(event.getMetadata()))
                .createdAt(event.getCreatedAt())
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse> getMyNotifications(UUID userId, int page, int size) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(
                        userId,
                        PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100))
                ).stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    @Override
    public void markRead(UUID notificationId, UUID userId) {
        NotificationRecord notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Notification not found"));

        if (notification.getReadAt() == null) {
            notification.setReadAt(OffsetDateTime.now());
            notificationRepository.save(notification);
        }
    }

    @Override
    public void markAllRead(UUID userId) {
        notificationRepository.markAllRead(userId, OffsetDateTime.now());
    }

    private NotificationResponse toResponse(NotificationRecord record) {
        return NotificationResponse.builder()
                .id(record.getId())
                .type(record.getType())
                .title(record.getTitle())
                .body(record.getBody())
                .entityType(record.getEntityType())
                .entityId(record.getEntityId())
                .metadata(readMetadata(record.getMetadataJson()))
                .createdAt(record.getCreatedAt())
                .readAt(record.getReadAt())
                .build();
    }

    private String writeMetadata(Map<String, String> metadata) {
        try {
            return objectMapper.writeValueAsString(metadata == null ? Collections.emptyMap() : metadata);
        } catch (Exception ex) {
            log.warn("Failed to serialize notification metadata", ex);
            return "{}";
        }
    }

    private Map<String, String> readMetadata(String metadataJson) {
        if (metadataJson == null || metadataJson.isBlank()) {
            return Collections.emptyMap();
        }
        try {
            return objectMapper.readValue(metadataJson, STRING_MAP_TYPE);
        } catch (Exception ex) {
            log.warn("Failed to deserialize notification metadata for response", ex);
            return Collections.emptyMap();
        }
    }
}
