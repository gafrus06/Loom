package ru.funkids.filestorageservice.rest;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.funkids.filestorageservice.dto.*;
import ru.funkids.filestorageservice.security.GatewayUserPrincipal;
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
            @RequestParam String contentType,
            @RequestHeader(value = "X-Caller-Service", required = false) String callerService,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {

        return ResponseEntity.ok(
                fileStorageService.generateUploadUrl(service, entityType, filename, contentType, callerService, currentUser)
        );
    }

    @PostMapping("/download-urls")
    public ResponseEntity<DownloadUrlsResponse> getDownloadUrls(
            @RequestBody DownloadUrlsRequest request,
            @RequestHeader(value = "X-Caller-Service", required = false) String callerService,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {

        return ResponseEntity.ok(fileStorageService.generateDownloadUrls(request, callerService, currentUser));
    }

    @PostMapping("/{fileId}/confirm-upload")
    public ResponseEntity<Void> confirmUpload(
            @PathVariable UUID fileId,
            @RequestParam String ownerEntityId,
            @RequestHeader(value = "X-Caller-Service", required = false) String callerService,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {

        fileStorageService.confirmUpload(fileId, ownerEntityId, callerService, currentUser);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{fileId}/download-url")
    public ResponseEntity<DownloadUrlResponse> getDownloadUrl(
            @PathVariable UUID fileId,
            @RequestHeader(value = "X-Caller-Service", required = false) String callerService,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(fileStorageService.generateDownloadUrl(fileId, callerService, currentUser));
    }

    @GetMapping("/{fileId}/info")
    public ResponseEntity<FileInfoResponse> getFileInfo(
            @PathVariable UUID fileId,
            @RequestHeader(value = "X-Caller-Service", required = false) String callerService,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(fileStorageService.getFileInfo(fileId, callerService, currentUser));
    }
}
