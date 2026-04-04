package ru.funkids.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class VerifyRequest {
    private UUID userId;

    @NotBlank
    private String phone;

    @NotBlank
    private String code;
}
