package ru.fun.userservice.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class EditUserProfileRequest  {
    private String firstName;
    private String secondName;
    private String thirdName;

    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$",
            message = "Телефон должен быть в формате E.164, например +79001234567")
    @Size(max = 16, message = "Максимум 16 символов (включая +)")
    private String phone;

    private java.util.UUID avatarFileId;
}
