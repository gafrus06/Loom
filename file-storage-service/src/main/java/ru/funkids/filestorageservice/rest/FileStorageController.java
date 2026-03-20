package ru.funkids.filestorageservice.rest;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.funkids.filestorageservice.dto.*;
import ru.funkids.filestorageservice.service.FileStorageService;

import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileStorageController {

    private static final Logger log = LoggerFactory.getLogger(FileStorageController.class);

    private final FileStorageService fileStorageService;

    @PostMapping("/generate-upload-url")
    public ResponseEntity<UploadUrlResponse> generateUploadUrl(
            @RequestParam String service,
            @RequestParam String entityType,
            @RequestParam String filename,
            @RequestParam String contentType) {

        return ResponseEntity.ok(
                fileStorageService.generateUploadUrl(service, entityType, filename, contentType)
        );
    }

    @PostMapping("/download-urls")
    public ResponseEntity<DownloadUrlsResponse> getDownloadUrls(
            @RequestBody DownloadUrlsRequest request) {

        return ResponseEntity.ok(fileStorageService.generateDownloadUrls(request));
    }

    @PostMapping("/{fileId}/confirm-upload")
    public ResponseEntity<Void> confirmUpload(
            @PathVariable UUID fileId,
            @RequestParam String ownerEntityId) {

        fileStorageService.confirmUpload(fileId, ownerEntityId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{fileId}/download-url")
    public ResponseEntity<DownloadUrlResponse> getDownloadUrl(@PathVariable UUID fileId) {
        return ResponseEntity.ok(fileStorageService.generateDownloadUrl(fileId));
    }

    @GetMapping("/{fileId}/info")
    public ResponseEntity<FileInfoResponse> getFileInfo(@PathVariable UUID fileId) {
        return ResponseEntity.ok(fileStorageService.getFileInfo(fileId));
    }
}