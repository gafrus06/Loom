package ru.funkids.notificationservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
@JsonIgnoreProperties(ignoreUnknown = true)
public class NotificationRequestedEvent {
    private UUID notificationId;
    private UUID userId;
    private String type;
    private String title;
    private String body;
    private String entityType;
    private UUID entityId;
    private Map<String, String> metadata;
    private OffsetDateTime createdAt;
    private UUID eventId;
    private UUID correlationId;
    private Integer version;
}
