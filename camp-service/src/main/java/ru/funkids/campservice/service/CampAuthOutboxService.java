package ru.funkids.campservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.funkids.campservice.entity.CampAuthOutboxEvent;
import ru.funkids.campservice.repository.CampAuthOutboxRepository;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CampAuthOutboxService {

    private final CampAuthOutboxRepository repository;

    public void enqueueAssignRole(UUID userId, String role) {
        repository.save(CampAuthOutboxEvent.builder()
                .userId(userId)
                .role(role)
                .build());
    }
}
