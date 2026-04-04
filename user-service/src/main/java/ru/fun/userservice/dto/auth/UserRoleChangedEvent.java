package ru.fun.userservice.dto.auth;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserRoleChangedEvent {
    private String userId;
    private String role;
    private String action;
    private UUID eventId;
    private UUID correlationId;
    private Instant occurredAt;
    private Integer version;
}
