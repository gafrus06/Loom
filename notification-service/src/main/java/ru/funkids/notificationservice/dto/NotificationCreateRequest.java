package ru.funkids.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationCreateRequest {

    @NotNull
    private UUID userId;

    @NotBlank
    private String type;

    @NotBlank
    private String title;

    @NotBlank
    private String body;

    private String entityType;
    private UUID entityId;
    private Map<String, String> metadata;
}
