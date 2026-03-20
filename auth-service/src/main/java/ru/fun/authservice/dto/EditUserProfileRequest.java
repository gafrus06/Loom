package ru.fun.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class EditUserProfileRequest {
    private String firstName;
    private String secondName;
    private String thirdName;
    private String phone;
    private String avatarUrl;

}
