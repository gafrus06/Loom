package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.CampMessage;
import ru.funkids.campservice.entity.CampMessageType;

import java.util.List;
import java.util.UUID;

public interface CampMessageRepository extends JpaRepository<CampMessage, UUID> {
    List<CampMessage> findByDetachmentIdOrderByCreatedAtDesc(UUID detachmentId);
    List<CampMessage> findByReceiverUserIdOrderByCreatedAtDesc(UUID receiverUserId);
    long countByReceiverUserIdAndReadAtIsNull(UUID receiverUserId);
    List<CampMessage> findBySessionIdAndMessageTypeOrderByCreatedAtDesc(UUID sessionId, CampMessageType messageType);
}
