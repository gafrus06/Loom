package ru.funkids.campservice.client.dto;

import lombok.*;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationCreateRequest {
    private UUID userId;
    private String type;
    private String title;
    private String body;
    private String entityType;
    private UUID entityId;
    private Map<String, String> metadata;
}
