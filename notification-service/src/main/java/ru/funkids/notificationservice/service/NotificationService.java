package ru.funkids.notificationservice.service;

import ru.funkids.notificationservice.dto.NotificationCreateRequest;
import ru.funkids.notificationservice.dto.NotificationQueuedResponse;
import ru.funkids.notificationservice.dto.NotificationRequestedEvent;
import ru.funkids.notificationservice.dto.NotificationResponse;

import java.util.List;
import java.util.UUID;

public interface NotificationService {
    NotificationQueuedResponse enqueue(NotificationCreateRequest request);
    void store(NotificationRequestedEvent event);
    List<NotificationResponse> getMyNotifications(UUID userId, int page, int size);
    long getUnreadCount(UUID userId);
    void markRead(UUID notificationId, UUID userId);
    void markAllRead(UUID userId);
}
