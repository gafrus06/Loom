package ru.fun.userservice.dto.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserRegisteredEvent {
    private String userId;
    private String email;
    private String role;
    private UUID eventId;
    private UUID correlationId;
    private Instant occurredAt;
    private Integer version;
}
