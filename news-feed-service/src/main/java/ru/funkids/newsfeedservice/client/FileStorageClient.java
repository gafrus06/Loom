package ru.funkids.newsfeedservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import ru.funkids.newsfeedservice.config.FeignConfig;
import ru.funkids.newsfeedservice.dto.client.*;

import java.util.UUID;

@FeignClient(
        name = "file-storage-service",
        configuration = FeignConfig.class
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
