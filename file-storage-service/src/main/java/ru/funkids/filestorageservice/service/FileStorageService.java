package ru.funkids.filestorageservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import ru.funkids.filestorageservice.dto.*;
import ru.funkids.filestorageservice.entity.FileMetadata;
import ru.funkids.filestorageservice.repository.FileMetadataRepository;
import ru.funkids.filestorageservice.security.GatewayUserPrincipal;

import java.util.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final S3Service s3Service;
    private final FileMetadataRepository fileMetadataRepository;

    public UploadUrlResponse generateUploadUrl(String service, String entityType,
                                               String originalFilename, String contentType,
                                               String callerService,
                                               GatewayUserPrincipal currentUser) {
        String normalizedService = normalizeService(service);
        String normalizedCaller = normalizeService(callerService);
        enforceUploadPolicy(normalizedService, normalizedCaller, currentUser);

        FileMetadata metadata = new FileMetadata();
        metadata.setOriginalName(originalFilename);
        metadata.setMimeType(contentType);
        metadata.setOwnerService(normalizedService);
        metadata.setBucketName(s3Service.getBucketName());

        metadata = fileMetadataRepository.save(metadata);

        String objectKey = s3Service.generateObjectKey(normalizedService, entityType, metadata.getId(), originalFilename);
        metadata.setObjectKey(objectKey);

        fileMetadataRepository.save(metadata);

        String uploadUrl = s3Service.generatePresignedUploadUrl(objectKey, contentType);

        UploadUrlResponse response = new UploadUrlResponse();
        response.setFileId(metadata.getId());
        response.setUploadUrl(uploadUrl);

        log.info("Generated upload URL for fileId: {}, service: {}, entityType: {}",
                metadata.getId(), service, entityType);

        return response;
    }

    /**
     * Batch генерация download URLs
     */
    public DownloadUrlsResponse generateDownloadUrls(DownloadUrlsRequest request,
                                                     String callerService,
                                                     GatewayUserPrincipal currentUser) {

        if (request.getFileIds() == null || request.getFileIds().isEmpty()) {
            return DownloadUrlsResponse.builder()
                    .urls(Collections.emptyMap())
                    .build();
        }

        Map<UUID, String> urls = new HashMap<>();

        List<FileMetadata> files =
                fileMetadataRepository.findAllById(request.getFileIds());

        for (FileMetadata file : files) {
            assertReadAccess(file, normalizeService(callerService), currentUser);

            String url = s3Service.generatePresignedDownloadUrl(file.getObjectKey());

            urls.put(file.getId(), url);
        }

        return DownloadUrlsResponse.builder()
                .urls(urls)
                .build();
    }

    public void confirmUpload(UUID fileId, String ownerEntityId, String callerService, GatewayUserPrincipal currentUser) {

        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));

        if (metadata.getObjectKey() == null || !s3Service.objectExists(metadata.getObjectKey())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Uploaded object not found in storage");
        }

        assertConfirmAccess(metadata, ownerEntityId, normalizeService(callerService), currentUser);
        metadata.setOwnerEntityId(ownerEntityId);

        fileMetadataRepository.save(metadata);

        log.info("Confirmed upload for fileId: {}, ownerEntityId: {}", fileId, ownerEntityId);
    }

    public DownloadUrlResponse generateDownloadUrl(UUID fileId, String callerService, GatewayUserPrincipal currentUser) {

        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));
        assertReadAccess(metadata, normalizeService(callerService), currentUser);

        String downloadUrl = s3Service.generatePresignedDownloadUrl(metadata.getObjectKey());

        DownloadUrlResponse response = new DownloadUrlResponse();
        response.setDownloadUrl(downloadUrl);

        log.info("Generated download URL for fileId: {}", fileId);

        return response;
    }

    public FileInfoResponse getFileInfo(UUID fileId, String callerService, GatewayUserPrincipal currentUser) {

        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));
        assertReadAccess(metadata, normalizeService(callerService), currentUser);

        FileInfoResponse response = new FileInfoResponse();
        response.setFileId(metadata.getId());
        response.setOriginalName(metadata.getOriginalName());
        response.setMimeType(metadata.getMimeType());
        response.setSize(metadata.getSize());
        response.setOwnerService(metadata.getOwnerService());
        response.setOwnerEntityId(metadata.getOwnerEntityId());
        response.setUploadedAt(metadata.getUploadedAt().toString());

        return response;
    }

    private void enforceUploadPolicy(String ownerService, String callerService, GatewayUserPrincipal currentUser) {
        if ("user-service".equals(ownerService)) {
            if (currentUser == null) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Authenticated user is required");
            }
            return;
        }
        if ("camp-service".equals(ownerService) && isGatewayUserRequest(callerService, currentUser)) {
            return;
        }
        if (!ownerService.equals(callerService)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Caller service mismatch");
        }
    }

    private void assertConfirmAccess(FileMetadata metadata,
                                     String ownerEntityId,
                                     String callerService,
                                     GatewayUserPrincipal currentUser) {
        if ("user-service".equals(metadata.getOwnerService())) {
            if (currentUser == null || !currentUser.getUserId().toString().equals(ownerEntityId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only bind files to yourself");
            }
            return;
        }
        if ("camp-service".equals(metadata.getOwnerService()) && isGatewayUserRequest(callerService, currentUser)) {
            return;
        }
        if (!metadata.getOwnerService().equals(callerService)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only owning service can confirm this file");
        }
    }

    private void assertReadAccess(FileMetadata metadata, String callerService, GatewayUserPrincipal currentUser) {
        if ("user-service".equals(metadata.getOwnerService())) {
            boolean isOwner = currentUser != null
                    && metadata.getOwnerEntityId() != null
                    && metadata.getOwnerEntityId().equals(currentUser.getUserId().toString());
            boolean trustedService = "user-service".equals(callerService) || "news-feed-service".equals(callerService);
            if (!isOwner && !trustedService) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
            }
            return;
        }
        if ("camp-service".equals(metadata.getOwnerService()) && isGatewayUserRequest(callerService, currentUser)) {
            return;
        }
        if (metadata.getOwnerService().equals(callerService)) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
    }

    private boolean isGatewayUserRequest(String callerService, GatewayUserPrincipal currentUser) {
        return "api-gateway".equals(callerService) && currentUser != null;
    }

    private String normalizeService(String service) {
        if (service == null || service.isBlank()) {
            return "api-gateway";
        }
        if ("news-feed".equals(service)) {
            return "news-feed-service";
        }
        return service;
    }
}
