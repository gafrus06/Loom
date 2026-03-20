package ru.fun.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserRoleChangedEvent {
    private String userId;
    private String role;
    private String action; // ASSIGNED / REMOVED
}