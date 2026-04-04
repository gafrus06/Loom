package ru.funkids.filestorageservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.filestorageservice.entity.FileMetadata;
import ru.funkids.filestorageservice.repository.FileMetadataRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StaleUploadCleanupService {

    private final FileMetadataRepository fileMetadataRepository;
    private final S3Service s3Service;

    @Value("${file-storage.cleanup.unconfirmed-age-minutes:120}")
    private long unconfirmedAgeMinutes;

    @Scheduled(fixedDelayString = "${file-storage.cleanup.fixed-delay-ms:900000}")
    @Transactional
    public void cleanupStaleUnconfirmedUploads() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(unconfirmedAgeMinutes);
        List<FileMetadata> staleFiles = fileMetadataRepository.findByOwnerEntityIdIsNullAndUploadedAtBefore(threshold);
        for (FileMetadata file : staleFiles) {
            try {
                if (file.getObjectKey() != null && s3Service.objectExists(file.getObjectKey())) {
                    s3Service.deleteObject(file.getObjectKey());
                }
                fileMetadataRepository.delete(file);
            } catch (Exception ex) {
                log.warn("Failed to cleanup stale upload fileId={}", file.getId(), ex);
            }
        }
    }
}
