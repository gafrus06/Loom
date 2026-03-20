package ru.fun.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data @AllArgsConstructor @NoArgsConstructor @Builder
public class UserProfileResponse {
    private String id;
    private String email;
    private String firstName;
    private String secondName;
    private String thirdName;
    private String phone;
    private Boolean phoneVerified;
    private String avatarUrl;
    private UUID avatarFileId;
    private List<String> roles;

    private ParentProfileDto parent;
    private CounselorProfileDto counselor;
}

