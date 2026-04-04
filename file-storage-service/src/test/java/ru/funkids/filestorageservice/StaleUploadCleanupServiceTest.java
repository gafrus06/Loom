package ru.funkids.filestorageservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ru.funkids.filestorageservice.entity.FileMetadata;
import ru.funkids.filestorageservice.repository.FileMetadataRepository;
import ru.funkids.filestorageservice.service.S3Service;
import ru.funkids.filestorageservice.service.StaleUploadCleanupService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StaleUploadCleanupServiceTest {

    @Mock private FileMetadataRepository fileMetadataRepository;
    @Mock private S3Service s3Service;

    @InjectMocks
    private StaleUploadCleanupService cleanupService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(cleanupService, "unconfirmedAgeMinutes", 120L);
    }

    @Test
    void cleanupDeletesOldUnconfirmedUploads() {
        FileMetadata file = new FileMetadata();
        file.setId(UUID.randomUUID());
        file.setObjectKey("user/avatar/test.png");
        file.setUploadedAt(LocalDateTime.now().minusHours(3));

        when(fileMetadataRepository.findByOwnerEntityIdIsNullAndUploadedAtBefore(any())).thenReturn(List.of(file));
        when(s3Service.objectExists(file.getObjectKey())).thenReturn(true);

        cleanupService.cleanupStaleUnconfirmedUploads();

        verify(s3Service).deleteObject(file.getObjectKey());
        verify(fileMetadataRepository).delete(file);
    }
}
