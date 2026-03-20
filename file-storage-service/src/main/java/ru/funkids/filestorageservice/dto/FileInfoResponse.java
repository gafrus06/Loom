package ru.funkids.filestorageservice.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class FileInfoResponse {
    private UUID fileId;
    private String originalName;
    private String mimeType;
    private Long size;
    private String ownerService;
    private String ownerEntityId;
    private String uploadedAt;
}
