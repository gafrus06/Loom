package ru.fun.userservice.dto.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.util.UUID;

@Data
public class PhoneVerificationConfirmRequest {
    private UUID userId;

    @NotBlank
    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$", message = "Телефон должен быть в формате E.164")
    private String phone;

    @NotBlank
    private String code;
}
