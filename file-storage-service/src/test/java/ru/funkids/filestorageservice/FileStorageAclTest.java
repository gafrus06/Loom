package ru.funkids.filestorageservice;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import ru.funkids.filestorageservice.entity.FileMetadata;
import ru.funkids.filestorageservice.repository.FileMetadataRepository;
import ru.funkids.filestorageservice.security.GatewayUserPrincipal;
import ru.funkids.filestorageservice.service.FileStorageService;
import ru.funkids.filestorageservice.service.S3Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class FileStorageAclTest {

    @Test
    void rejectsReadingAnotherUsersFileThroughGateway() {
        FileMetadataRepository repository = mock(FileMetadataRepository.class);
        S3Service s3Service = mock(S3Service.class);
        FileStorageService service = new FileStorageService(s3Service, repository);

        UUID fileId = UUID.randomUUID();
        FileMetadata metadata = new FileMetadata();
        metadata.setId(fileId);
        metadata.setOwnerService("user-service");
        metadata.setOwnerEntityId("00000000-0000-0000-0000-000000000001");
        metadata.setObjectKey("users/avatar/" + fileId);
        metadata.setUploadedAt(LocalDateTime.now());
        when(repository.findById(fileId)).thenReturn(Optional.of(metadata));

        GatewayUserPrincipal anotherUser = new GatewayUserPrincipal(
                "00000000-0000-0000-0000-000000000002", "user", Set.of("ROLE_USER"));

        assertThatThrownBy(() -> service.generateDownloadUrl(fileId, "api-gateway", anotherUser))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403 FORBIDDEN");
    }

    @Test
    void rejectsGatewayUploadInitForServiceOwnedNewsMedia() {
        FileMetadataRepository repository = mock(FileMetadataRepository.class);
        S3Service s3Service = mock(S3Service.class);
        FileStorageService service = new FileStorageService(s3Service, repository);

        GatewayUserPrincipal user = new GatewayUserPrincipal(
                "00000000-0000-0000-0000-000000000001", "user", Set.of("ROLE_USER"));

        assertThatThrownBy(() -> service.generateUploadUrl(
                "news-feed-service",
                "post",
                "image.jpg",
                "image/jpeg",
                "api-gateway",
                user
        ))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403 FORBIDDEN");
    }
}
