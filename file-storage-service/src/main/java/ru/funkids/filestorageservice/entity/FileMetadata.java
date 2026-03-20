package ru.funkids.filestorageservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "files")
@Data
public class FileMetadata {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String originalName;
    private String mimeType;
    private Long size;
    private String bucketName;
    private String objectKey;

    // Владелец файла (какой сервис и какая сущность)
    private String ownerService; // "user-service", "post-service"
    private String ownerEntityId; // UUID пользователя, поста и т.д.

    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        uploadedAt = LocalDateTime.now();
    }
}
