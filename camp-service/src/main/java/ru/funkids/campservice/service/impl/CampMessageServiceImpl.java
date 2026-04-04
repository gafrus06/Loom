package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.CampMessageCreateDto;
import ru.funkids.campservice.dto.CampMessageResponseDto;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.CampMessageRepository;
import ru.funkids.campservice.repository.DetachmentRepository;
import ru.funkids.campservice.repository.SessionRepository;
import ru.funkids.campservice.security.CampSecurityService;
import ru.funkids.campservice.security.DetachmentSecurityService;
import ru.funkids.campservice.service.CampMessageService;
import ru.funkids.campservice.service.CampNotificationService;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class CampMessageServiceImpl implements CampMessageService {

    private final CampMessageRepository campMessageRepository;
    private final SessionRepository sessionRepository;
    private final DetachmentRepository detachmentRepository;
    private final DetachmentSecurityService detachmentSecurityService;
    private final CampSecurityService campSecurityService;
    private final CampNotificationService campNotificationService;

    @Override
    public CampMessageResponseDto create(CampMessageCreateDto dto, UUID actorUserId) {
        Session session = sessionRepository.findById(dto.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Смена не найдена: " + dto.getSessionId()));
        Detachment detachment = dto.getDetachmentId() == null ? null : detachmentRepository.findById(dto.getDetachmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Отряд не найден: " + dto.getDetachmentId()));

        if (dto.getMessageType() == CampMessageType.PARENT_TO_COUNSELOR) {
            if (!detachmentSecurityService.isParentHasChildInDetachment(dto.getDetachmentId(), actorUserId)) {
                throw new AccessDeniedException("Родитель может писать только в отряд своего ребёнка");
            }
            if (dto.getReceiverUserId() == null) {
                throw new IllegalArgumentException("Для обращения к вожатому нужен receiverUserId");
            }
        }

        if (dto.getMessageType() == CampMessageType.COUNSELOR_TO_MEDICAL) {
            if (!campSecurityService.canViewSessionTasks(dto.getSessionId(), actorUserId)) {
                throw new AccessDeniedException("Вожатый не привязан к этой смене");
            }
            if (dto.getReceiverUserId() == null) {
                throw new IllegalArgumentException("Для сообщения медработнику нужен receiverUserId");
            }
        }

        if (dto.getMessageType() == CampMessageType.MEDICAL_REPLY) {
            if (dto.getReceiverUserId() == null) {
                throw new IllegalArgumentException("Для ответа нужен receiverUserId");
            }
        }

        CampMessage saved = campMessageRepository.save(CampMessage.builder()
                .senderUserId(actorUserId)
                .receiverUserId(dto.getReceiverUserId())
                .camp(session.getCamp())
                .session(session)
                .detachment(detachment)
                .messageType(dto.getMessageType())
                .anonymous(dto.isAnonymous())
                .text(dto.getText())
                .build());

        if (saved.getReceiverUserId() != null) {
            campNotificationService.notifyUser(
                    saved.getReceiverUserId(),
                    "CAMP_MESSAGE_CREATED",
                    "Новое сообщение",
                    saved.getText().length() > 120 ? saved.getText().substring(0, 120) : saved.getText(),
                    "CAMP_MESSAGE",
                    saved.getId(),
                    Map.of("messageType", saved.getMessageType().name())
            );
        }

        return toDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampMessageResponseDto> listByDetachment(UUID detachmentId, UUID actorUserId) {
        if (!detachmentSecurityService.canViewDetachment(detachmentId, actorUserId)) {
            throw new AccessDeniedException("Нет доступа к сообщениям отряда");
        }
        return campMessageRepository.findByDetachmentIdOrderByCreatedAtDesc(detachmentId).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CampMessageResponseDto> listInbox(UUID actorUserId) {
        return campMessageRepository.findByReceiverUserIdOrderByCreatedAtDesc(actorUserId).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public void markRead(UUID messageId, UUID actorUserId) {
        CampMessage message = campMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Сообщение не найдено: " + messageId));
        if (!actorUserId.equals(message.getReceiverUserId())) {
            throw new AccessDeniedException("Можно отмечать прочитанным только свои сообщения");
        }
        if (message.getReadAt() == null) {
            message.setReadAt(OffsetDateTime.now());
            campMessageRepository.save(message);
        }
    }

    private CampMessageResponseDto toDto(CampMessage message) {
        return CampMessageResponseDto.builder()
                .id(message.getId())
                .senderUserId(message.getSenderUserId())
                .receiverUserId(message.getReceiverUserId())
                .campId(message.getCamp().getId())
                .sessionId(message.getSession().getId())
                .detachmentId(message.getDetachment() == null ? null : message.getDetachment().getId())
                .messageType(message.getMessageType())
                .anonymous(message.isAnonymous())
                .text(message.getText())
                .createdAt(message.getCreatedAt())
                .readAt(message.getReadAt())
                .build();
    }
}
