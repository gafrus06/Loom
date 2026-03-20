package ru.fun.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import ru.fun.authservice.entity.Role;

import java.util.Set;

@Data
@AllArgsConstructor
public class UserRoleResponse {
    private String email;
    private Set<String> role;
}
