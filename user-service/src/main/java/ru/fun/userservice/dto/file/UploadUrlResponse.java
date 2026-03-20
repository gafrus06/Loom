package ru.fun.userservice.dto.file;

import lombok.Data;

import java.util.UUID;

@Data
public class UploadUrlResponse {
    private UUID fileId;
    private String uploadUrl;
    private String method = "PUT";
}

