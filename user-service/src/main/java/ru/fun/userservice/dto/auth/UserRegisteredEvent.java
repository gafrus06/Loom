package ru.fun.userservice.dto.auth;

import lombok.Data;

import java.util.UUID;

@Data
public class UserRegisteredEvent {
    private UUID userId;
    private String email;
    private String role;
}
