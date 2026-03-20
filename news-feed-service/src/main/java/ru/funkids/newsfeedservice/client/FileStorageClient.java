package ru.funkids.newsfeedservice.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;
import ru.funkids.newsfeedservice.config.FeignConfig;
import ru.funkids.newsfeedservice.dto.client.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@FeignClient(
        name = "file-storage-service",
        configuration = FeignConfig.class,
        fallback = FileStorageClientFallback.class
)
public interface FileStorageClient {

    @PostMapping("/api/files/generate-upload-url")
    UploadUrlResponse generateUploadUrl(
            @RequestParam("service")     String service,
            @RequestParam("entityType")  String entityType,
            @RequestParam("filename")    String filename,
            @RequestParam("contentType") String contentType
    );

    @PostMapping("/api/files/download-urls")
    DownloadUrlsResponse getDownloadUrls(@RequestBody DownloadUrlsRequest request);

    @GetMapping("/api/files/{fileId}/download-url")
    DownloadUrlResponse getDownloadUrl(@PathVariable("fileId") UUID fileId);

    @PostMapping("/api/files/{fileId}/confirm-upload")
    void confirmUpload(
            @PathVariable("fileId")        UUID fileId,
            @RequestParam("ownerEntityId") String ownerEntityId
    );
}

@Component
@Slf4j
class FileStorageClientFallback implements FileStorageClient {

    @Override
    public UploadUrlResponse generateUploadUrl(String service, String entityType,
                                               String filename, String contentType) {
        log.warn("FileStorageClient fallback: generateUploadUrl");
        UUID id = UUID.randomUUID();
        return UploadUrlResponse.builder()
                .fileId(id)
                .uploadUrl("http://file-storage-service/uploads/" + id)
                .method("PUT")
                .build();
    }

    @Override
    public DownloadUrlsResponse getDownloadUrls(DownloadUrlsRequest request) {
        log.warn("FileStorageClient fallback: getDownloadUrls");
        Map<UUID, String> urls = new HashMap<>();
        for (UUID id : request.getFileIds()) {
            urls.put(id, "http://file-storage-service/downloads/" + id);
        }
        return DownloadUrlsResponse.builder().urls(urls).build();
    }

    @Override
    public DownloadUrlResponse getDownloadUrl(UUID fileId) {
        log.warn("FileStorageClient fallback: getDownloadUrl fileId={}", fileId);
        return DownloadUrlResponse.builder()
                .fileId(fileId)
                .downloadUrl("http://file-storage-service/downloads/" + fileId)
                .build();
    }

    @Override
    public void confirmUpload(UUID fileId, String ownerEntityId) {
        log.warn("FileStorageClient fallback: confirmUpload fileId={}", fileId);
    }
}