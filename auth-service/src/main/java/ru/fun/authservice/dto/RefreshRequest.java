package ru.fun.authservice.dto;

import lombok.Data;

@Data
public class RefreshRequest {
    private String token;
}
