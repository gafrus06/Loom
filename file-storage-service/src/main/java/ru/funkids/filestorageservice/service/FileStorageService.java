package ru.funkids.filestorageservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import ru.funkids.filestorageservice.dto.*;
import ru.funkids.filestorageservice.entity.FileMetadata;
import ru.funkids.filestorageservice.repository.FileMetadataRepository;

import java.util.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private final S3Service s3Service;
    private final FileMetadataRepository fileMetadataRepository;

    public UploadUrlResponse generateUploadUrl(String service, String entityType,
                                               String originalFilename, String contentType) {

        FileMetadata metadata = new FileMetadata();
        metadata.setOriginalName(originalFilename);
        metadata.setMimeType(contentType);
        metadata.setOwnerService(service);
        metadata.setBucketName(s3Service.getBucketName());

        metadata = fileMetadataRepository.save(metadata);

        String objectKey = s3Service.generateObjectKey(service, entityType, metadata.getId(), originalFilename);
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
    public DownloadUrlsResponse generateDownloadUrls(DownloadUrlsRequest request) {

        if (request.getFileIds() == null || request.getFileIds().isEmpty()) {
            return DownloadUrlsResponse.builder()
                    .urls(Collections.emptyMap())
                    .build();
        }

        Map<UUID, String> urls = new HashMap<>();

        List<FileMetadata> files =
                fileMetadataRepository.findAllById(request.getFileIds());

        for (FileMetadata file : files) {

            String url = s3Service.generatePresignedDownloadUrl(file.getObjectKey());

            urls.put(file.getId(), url);
        }

        return DownloadUrlsResponse.builder()
                .urls(urls)
                .build();
    }

    public void confirmUpload(UUID fileId, String ownerEntityId) {

        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));

        metadata.setOwnerEntityId(ownerEntityId);

        fileMetadataRepository.save(metadata);

        log.info("Confirmed upload for fileId: {}, ownerEntityId: {}", fileId, ownerEntityId);
    }

    public DownloadUrlResponse generateDownloadUrl(UUID fileId) {

        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));

        String downloadUrl = s3Service.generatePresignedDownloadUrl(metadata.getObjectKey());

        DownloadUrlResponse response = new DownloadUrlResponse();
        response.setDownloadUrl(downloadUrl);

        log.info("Generated download URL for fileId: {}", fileId);

        return response;
    }

    public FileInfoResponse getFileInfo(UUID fileId) {

        FileMetadata metadata = fileMetadataRepository.findById(fileId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found"));

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
}