package ru.fun.userservice.dto.notification;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class PhoneVerificationStartEvent {
    private UUID userId;

    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$", message = "Телефон должен быть в формате E.164")
    private String phone;

    private UUID eventId = UUID.randomUUID();
    private UUID correlationId = UUID.randomUUID();
    private Instant occurredAt = Instant.now();
    private Integer version = 1;
}
