package ru.fun.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserProfilePageResponse {
    private List<UserProfileResponse> users;
    private int currentPage;
    private int totalPages;
    private long totalElements;
}