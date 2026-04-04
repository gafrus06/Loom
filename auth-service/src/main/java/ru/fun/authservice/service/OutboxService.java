package ru.fun.authservice.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.fun.authservice.entity.OutboxEvent;
import ru.fun.authservice.repository.OutboxEventRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OutboxService {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public void enqueue(String eventType, UUID aggregateId, Object payload) {
        try {
            outboxEventRepository.save(OutboxEvent.builder()
                    .eventType(eventType)
                    .aggregateId(aggregateId)
                    .payloadJson(objectMapper.writeValueAsString(payload))
                    .build());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize outbox event " + eventType, ex);
        }
    }
}
