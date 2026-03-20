package ru.funkids.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyRequest {
    @NotBlank
    private String phone;
    @NotBlank
    private String code;
}
