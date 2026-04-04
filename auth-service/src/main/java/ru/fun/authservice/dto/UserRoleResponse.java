package ru.fun.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Set;

@Data
@AllArgsConstructor
public class UserRoleResponse {
    private String email;
    private Set<String> role;
}
