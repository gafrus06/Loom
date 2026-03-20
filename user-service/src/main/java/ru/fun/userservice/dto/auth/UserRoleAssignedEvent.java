package ru.fun.userservice.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserRoleAssignedEvent {
    private String userId;
    private String role;
    private String action; // ASSIGNED / REMOVED
}