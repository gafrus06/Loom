package ru.fun.authservice.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
public class UserRoleChangedEvent {
    private String userId;
    private String role;
    private String action;
    private UUID eventId;
    private UUID correlationId;
    private Instant occurredAt;
    private Integer version;

    public UserRoleChangedEvent(String userId, String role, String action) {
        this.userId = userId;
        this.role = role;
        this.action = action;
        this.eventId = UUID.randomUUID();
        this.correlationId = UUID.randomUUID();
        this.occurredAt = Instant.now();
        this.version = 1;
    }
}
