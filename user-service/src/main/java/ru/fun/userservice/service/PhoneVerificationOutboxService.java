package ru.fun.userservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fun.userservice.dto.notification.PhoneVerificationStartEvent;
import ru.fun.userservice.entity.PhoneVerificationOutboxEvent;
import ru.fun.userservice.repository.PhoneVerificationOutboxRepository;

@Service
@RequiredArgsConstructor
public class PhoneVerificationOutboxService {

    private final PhoneVerificationOutboxRepository repository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void enqueue(PhoneVerificationStartEvent event) {
        try {
            repository.save(PhoneVerificationOutboxEvent.builder()
                    .eventId(event.getEventId())
                    .userId(event.getUserId())
                    .phone(event.getPhone())
                    .payloadJson(objectMapper.writeValueAsString(event))
                    .build());
        } catch (Exception ex) {
            throw new RuntimeException("Failed to enqueue phone verification event", ex);
        }
    }
}
