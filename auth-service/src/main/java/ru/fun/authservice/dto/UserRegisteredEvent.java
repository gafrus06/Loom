package ru.fun.authservice.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
public class UserRegisteredEvent {
    private String userId;
    private String email;
    private String role;
    private UUID eventId;
    private UUID correlationId;
    private Instant occurredAt;
    private Integer version;

    public UserRegisteredEvent(String userId, String email, String role) {
        this.userId = userId;
        this.email = email;
        this.role = role;
        this.eventId = UUID.randomUUID();
        this.correlationId = UUID.randomUUID();
        this.occurredAt = Instant.now();
        this.version = 1;
    }
}
