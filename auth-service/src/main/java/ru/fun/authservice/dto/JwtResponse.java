package ru.fun.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;

@Data
@AllArgsConstructor
@RequiredArgsConstructor
public class JwtResponse {
    private String accessToken;
    private String refreshToken;
    public JwtResponse(String accessToken){
        this.accessToken = accessToken;
    }
}
