package ru.fun.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ParentProfileDto {

    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelation; // новое поле: мать, отец, бабушка...
    private String address;
    private String notes;
}