package ru.fun.userservice.dto.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class PhoneVerificationStartRequest {
    @NotBlank
    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$", message = "Телефон должен быть в формате E.164")
    private String phone;
}
