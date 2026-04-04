package ru.funkids.newsfeedservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.funkids.newsfeedservice.client.FileStorageClient;
import ru.funkids.newsfeedservice.dto.client.DownloadUrlResponse;
import ru.funkids.newsfeedservice.dto.client.DownloadUrlsRequest;
import ru.funkids.newsfeedservice.dto.client.DownloadUrlsResponse;
import ru.funkids.newsfeedservice.dto.client.UploadUrlResponse;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/feed/media")
@RequiredArgsConstructor
@Slf4j
public class MediaController {

    private final FileStorageClient fileStorageClient;

    @PostMapping("/upload-url")
    @PreAuthorize("hasAnyRole('COUNSELOR', 'ADMIN')")
    public ResponseEntity<UploadUrlResponse> generateUploadUrl(
            @RequestParam String filename,
            @RequestParam String contentType) {
        return ResponseEntity.ok(
                fileStorageClient.generateUploadUrl("news-feed-service", "post", filename, contentType)
        );
    }

    /**
     * Одиночный presigned URL — используется в Post.js:
     *   authFetch(`/api/feed/media/${fileId}/url`)
     * Возвращает { url, expiresIn } — фронт читает data.url
     */
    @GetMapping("/{fileId}/url")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getMediaUrl(@PathVariable UUID fileId) {
        try {
            DownloadUrlResponse resp = fileStorageClient.getDownloadUrl(fileId);
            return ResponseEntity.ok(Map.of(
                    "fileId",    fileId,
                    "url",       resp.getDownloadUrl(),
                    "expiresIn", 300
            ));
        } catch (Exception e) {
            log.error("Failed to generate URL for fileId={}: {}", fileId, e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Failed to generate URL"));
        }
    }

    /**
     * Batch presigned URLs — для массовой загрузки медиа.
     */
    @PostMapping("/urls/batch")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<UUID, String>> getMediaUrls(@RequestBody List<UUID> fileIds) {
        DownloadUrlsRequest req = new DownloadUrlsRequest();
        req.setFileIds(fileIds);
        DownloadUrlsResponse resp = fileStorageClient.getDownloadUrls(req);
        return ResponseEntity.ok(resp.getUrls());
    }
}
