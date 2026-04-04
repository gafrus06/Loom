package ru.funkids.notificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private UUID id;
    private String type;
    private String title;
    private String body;
    private String entityType;
    private UUID entityId;
    private Map<String, String> metadata;
    private OffsetDateTime createdAt;
    private OffsetDateTime readAt;
}
