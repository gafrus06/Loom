package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fun.userservice.entity.DeadLetterEvent;
import ru.fun.userservice.repository.DeadLetterEventRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DeadLetterOperationsService {

    private final DeadLetterEventRepository repository;
    @Qualifier("replayKafkaTemplate")
    private final KafkaTemplate<String, String> replayKafkaTemplate;

    @Transactional
    public void store(String serviceName, String originalTopic, String dltTopic, String messageKey, String payload,
                      String exceptionClass, String exceptionMessage) {
        repository.save(DeadLetterEvent.builder()
                .serviceName(serviceName)
                .originalTopic(originalTopic)
                .dltTopic(dltTopic)
                .messageKey(messageKey)
                .payload(payload)
                .exceptionClass(exceptionClass)
                .exceptionMessage(exceptionMessage)
                .build());
    }

    @Transactional(readOnly = true)
    public List<DeadLetterEvent> list(String serviceName) {
        return repository.findTop100ByServiceNameOrderByCreatedAtDesc(serviceName);
    }

    @Transactional
    public void replay(UUID id) {
        DeadLetterEvent event = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dead letter not found: " + id));
        replayKafkaTemplate.send(event.getOriginalTopic(), event.getMessageKey(), event.getPayload());
        event.setReplayedAt(Instant.now());
    }
}
