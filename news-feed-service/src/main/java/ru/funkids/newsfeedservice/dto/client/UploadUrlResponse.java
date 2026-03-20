package ru.funkids.newsfeedservice.dto.client;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadUrlResponse {
    private UUID fileId;
    private String uploadUrl;  // Изменено с url на uploadUrl
    private String method;      // Добавлено поле method
    private String downloadUrl; // Опционально
    private String filename;
    private String contentType;
}