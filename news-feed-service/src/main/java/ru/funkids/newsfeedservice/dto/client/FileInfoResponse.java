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
public class FileInfoResponse {
    private UUID fileId;
    private String originalName;
    private String mimeType;
    private Long size;
    private String ownerService;
    private String ownerEntityId;
    private String uploadedAt;
}