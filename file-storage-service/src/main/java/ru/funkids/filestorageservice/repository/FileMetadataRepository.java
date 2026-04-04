package ru.funkids.filestorageservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.funkids.filestorageservice.entity.FileMetadata;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface FileMetadataRepository extends JpaRepository<FileMetadata, UUID> {
    List<FileMetadata> findByOwnerEntityIdIsNullAndUploadedAtBefore(LocalDateTime uploadedAt);
}
