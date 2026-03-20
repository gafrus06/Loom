package ru.funkids.notificationservice.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class PhoneVerificationStartEvent {
    private UUID userId;
    private String phone;
}