package ru.funkids.notificationservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PhoneVerificationStartEvent {
    private UUID userId;
    private String phone;
    private UUID eventId;
    private UUID correlationId;
    private Instant occurredAt;
    private Integer version;
}
