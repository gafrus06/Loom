package ru.funkids.newsfeedservice.dto.client;

import lombok.Data;

import java.util.UUID;

@Data
public class UserProfileDto {
    private UUID   id;
    private String firstName;
    private String lastName;
    private String middleName;
    private String phone;
    // fileId аватарки — конвертируется в presigned URL через file-storage-service
    private UUID   avatarFileId;
    // Готовый presigned URL — заполняется в PostService после загрузки
    private String avatarUrl;
}