package ru.fun.userservice.dto;

import lombok.Builder;

import java.util.UUID;

@Builder
public record UserBulkProfileResponse(
        UUID id,
        String firstName,
        String lastName,
        String middleName,
        String phone,
        UUID avatarFileId
) {
}
