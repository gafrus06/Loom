package ru.fun.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ParentProfileDto {
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String address;
    private String notes;
}

