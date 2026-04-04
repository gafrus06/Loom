package ru.funkids.campservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.funkids.campservice.entity.CampNotificationOutboxEvent;
import ru.funkids.campservice.repository.CampNotificationOutboxRepository;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CampNotificationOutboxService {

    private final CampNotificationOutboxRepository repository;
    private final ObjectMapper objectMapper;

    public void enqueue(UUID userId, String type, String title, String body, String entityType, UUID entityId,
                        Map<String, String> metadata) {
        try {
            repository.save(CampNotificationOutboxEvent.builder()
                    .userId(userId)
                    .type(type)
                    .title(title)
                    .body(body)
                    .entityType(entityType)
                    .entityId(entityId)
                    .metadataJson(objectMapper.writeValueAsString(metadata == null ? Map.of() : metadata))
                    .build());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize camp notification metadata", ex);
        }
    }
}
