package ru.funkids.campservice.service;

import java.util.Map;
import java.util.UUID;

public interface CampNotificationService {
    void notifyUser(UUID userId, String type, String title, String body, String entityType, UUID entityId, Map<String, String> metadata);
}
