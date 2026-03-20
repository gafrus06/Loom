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
public class DownloadUrlResponse {
    private String downloadUrl;
    private UUID fileId;
    private String filename;
    private String contentType;
    private Long expiresIn; // время жизни ссылки в секундах
}