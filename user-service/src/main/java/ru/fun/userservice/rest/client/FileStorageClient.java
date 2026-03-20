package ru.fun.userservice.rest.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import ru.fun.userservice.config.AppConfig;
import ru.fun.userservice.dto.file.DownloadUrlResponse;
import ru.fun.userservice.dto.file.UploadUrlResponse;

import java.util.UUID;

/**
 * url убран — Feign ищет через Eureka по имени "file-storage-service".
 * Имя должно точно совпадать с spring.application.name в file-storage-service.
 */
@FeignClient(name = "file-storage-service", configuration = AppConfig.class)
public interface FileStorageClient {

    @PostMapping("/api/files/generate-upload-url")
    UploadUrlResponse generateUploadUrl(
            @RequestParam String service,
            @RequestParam String entityType,
            @RequestParam String filename,
            @RequestParam String contentType);

    @PostMapping("/api/files/{fileId}/confirm-upload")
    void confirmUpload(
            @PathVariable("fileId") UUID fileId,
            @RequestParam("ownerEntityId") String ownerEntityId);

    @GetMapping("/api/files/{fileId}/download-url")
    DownloadUrlResponse getDownloadUrl(@PathVariable("fileId") UUID fileId);
}