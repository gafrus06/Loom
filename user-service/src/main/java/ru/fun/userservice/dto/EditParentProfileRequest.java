package ru.fun.userservice.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class EditParentProfileRequest {
    private String emergencyContactName;
    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$", message = "Телефон должен быть в формате E.164")
    private String emergencyContactPhone;
    private String address;
    private String notes;
}
