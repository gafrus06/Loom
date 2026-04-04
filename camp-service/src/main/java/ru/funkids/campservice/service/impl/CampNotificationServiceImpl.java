package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.service.CampNotificationOutboxService;
import ru.funkids.campservice.service.CampNotificationService;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CampNotificationServiceImpl implements CampNotificationService {

    private final CampNotificationOutboxService outboxService;

    @Override
    @Transactional
    public void notifyUser(UUID userId, String type, String title, String body, String entityType, UUID entityId,
                           Map<String, String> metadata) {
        outboxService.enqueue(userId, type, title, body, entityType, entityId, metadata);
    }
}
