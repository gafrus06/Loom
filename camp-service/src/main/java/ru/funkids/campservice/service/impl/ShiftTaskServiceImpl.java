package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.*;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.*;
import ru.funkids.campservice.security.CampSecurityService;
import ru.funkids.campservice.service.AuditEventService;
import ru.funkids.campservice.service.CampNotificationService;
import ru.funkids.campservice.service.ShiftTaskService;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ShiftTaskServiceImpl implements ShiftTaskService {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final ShiftTaskRepository shiftTaskRepository;
    private final ShiftTaskCompletionRepository shiftTaskCompletionRepository;
    private final ShiftTaskChecklistItemRepository shiftTaskChecklistItemRepository;
    private final ShiftTaskAttachmentRepository shiftTaskAttachmentRepository;
    private final SessionRepository sessionRepository;
    private final DetachmentRepository detachmentRepository;
    private final CounselorAssignmentRepository counselorAssignmentRepository;
    private final CampMemberSessionRepository campMemberSessionRepository;
    private final CampSecurityService campSecurityService;
    private final AuditEventService auditEventService;
    private final CampNotificationService campNotificationService;

    @Override
    public ShiftTaskResponseDto create(ShiftTaskCreateDto dto, UUID actorUserId) {
        Session session = sessionRepository.findById(dto.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("Смена не найдена: " + dto.getSessionId()));

        if (!session.getCamp().getId().equals(dto.getCampId())) {
            throw new IllegalArgumentException("Смена не относится к указанному лагерю");
        }
        if (!campSecurityService.canManageShiftTasks(dto.getSessionId(), actorUserId)) {
            throw new IllegalStateException("Только администратор лагеря или старший вожатый смены может создавать задачи");
        }
        if (dto.getTargetDate().isBefore(session.getStartDate()) || dto.getTargetDate().isAfter(session.getEndDate())) {
            throw new IllegalArgumentException("Дата задачи должна входить в диапазон смены");
        }

        Detachment detachment = null;
        if (dto.getTaskType() == ShiftTaskType.DETACHMENT) {
            if (dto.getDetachmentId() == null) {
                throw new IllegalArgumentException("Для задачи по конкретному отряду требуется detachmentId");
            }
            detachment = detachmentRepository.findById(dto.getDetachmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Отряд не найден: " + dto.getDetachmentId()));
            if (!detachment.getSession().getId().equals(dto.getSessionId())) {
                throw new IllegalArgumentException("Отряд не относится к указанной смене");
            }
        }

        ShiftTask task = ShiftTask.builder()
                .camp(session.getCamp())
                .session(session)
                .detachment(detachment)
                .taskType(dto.getTaskType())
                .title(dto.getTitle())
                .description(dto.getDescription())
                .targetDate(dto.getTargetDate())
                .createdByUserId(actorUserId)
                .build();

        ShiftTask saved = shiftTaskRepository.save(task);

        if (dto.getChecklistItems() != null) {
            for (ShiftTaskChecklistItemCreateDto itemDto : dto.getChecklistItems()) {
                shiftTaskChecklistItemRepository.save(ShiftTaskChecklistItem.builder()
                        .task(saved)
                        .title(itemDto.getTitle())
                        .required(itemDto.isRequired())
                        .sortOrder(itemDto.getSortOrder() == null ? 0 : itemDto.getSortOrder())
                        .build());
            }
        }
        if (dto.getAttachments() != null) {
            for (ShiftTaskAttachmentCreateDto attachmentDto : dto.getAttachments()) {
                shiftTaskAttachmentRepository.save(ShiftTaskAttachment.builder()
                        .task(saved)
                        .fileId(attachmentDto.getFileId())
                        .originalFileName(attachmentDto.getOriginalFileName())
                        .uploadedByUserId(actorUserId)
                        .build());
            }
        }

        auditEventService.log(
                session.getCamp().getId(),
                "SHIFT_TASK_CREATED",
                "Создана задача «" + saved.getTitle() + "»",
                "SHIFT_TASK",
                saved.getId(),
                actorUserId,
                Map.of(
                        "sessionId", session.getId().toString(),
                        "taskType", saved.getTaskType().name(),
                        "targetDate", saved.getTargetDate().toString()
                )
        );

        campMemberSessionRepository.findBySessionIdAndAssignmentStatusAndActiveTrue(session.getId(), AssignmentStatus.ACCEPTED)
                .stream()
                .filter(a -> a.getSubRole() == StaffSubRole.COUNSELOR || a.getSubRole() == StaffSubRole.SENIOR_COUNSELOR)
                .forEach(a -> campNotificationService.notifyUser(
                        a.getCampMember().getUserId(),
                        "SHIFT_TASK_CREATED",
                        "Новая задача смены",
                        saved.getTitle(),
                        "SHIFT_TASK",
                        saved.getId(),
                        Map.of("sessionId", session.getId().toString())
                ));

        return mapTask(saved, actorUserId, dto.getDetachmentId());
    }

    @Override
    @Transactional(readOnly = true)
    public ShiftTaskResponseDto getById(UUID taskId, UUID actorUserId) {
        ShiftTask task = shiftTaskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Задача не найдена: " + taskId));
        if (!campSecurityService.canViewSessionTasks(task.getSession().getId(), actorUserId)) {
            throw new IllegalStateException("Нет доступа к этой задаче");
        }
        return mapTask(task, actorUserId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShiftTaskResponseDto> listBySession(UUID sessionId, UUID actorUserId) {
        if (!campSecurityService.canViewSessionTasks(sessionId, actorUserId)) {
            throw new IllegalStateException("Нет доступа к задачам этой смены");
        }
        return shiftTaskRepository.findBySessionIdOrderByTargetDateAscCreatedAtAsc(sessionId).stream()
                .map(task -> mapTask(task, actorUserId, null))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShiftTaskResponseDto> listForCurrentDay(UUID sessionId, UUID actorUserId, LocalDate currentDate, UUID detachmentId) {
        if (!campSecurityService.canViewSessionTasks(sessionId, actorUserId)) {
            throw new IllegalStateException("Нет доступа к задачам этой смены");
        }

        List<UUID> detachmentIds = counselorAssignmentRepository.findByUserIdAndDetachment_Session_IdAndActiveTrue(actorUserId, sessionId)
                .stream().map(a -> a.getDetachment().getId()).distinct().toList();

        return shiftTaskRepository.findBySessionIdAndTargetDateOrderByCreatedAtAsc(sessionId, currentDate).stream()
                .filter(task -> task.getTaskType() == ShiftTaskType.GENERAL
                        || (task.getDetachment() != null && detachmentIds.contains(task.getDetachment().getId())))
                .map(task -> mapTask(task, actorUserId, detachmentId))
                .toList();
    }

    @Override
    public ShiftTaskCompletionResponseDto upsertCompletion(ShiftTaskCompletionUpsertDto dto, UUID actorUserId) {
        ShiftTask task = shiftTaskRepository.findById(dto.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("???????????? ???? ??????????????: " + dto.getTaskId()));

        if (!campSecurityService.canCompleteTask(task, actorUserId, dto.getDetachmentId())) {
            throw new IllegalStateException("?????? ???????? ???? ?????????????? ???????????????????? ????????????");
        }

        Detachment detachment = dto.getDetachmentId() == null ? null : detachmentRepository.findById(dto.getDetachmentId())
                .orElseThrow(() -> new ResourceNotFoundException("?????????? ???? ????????????: " + dto.getDetachmentId()));

        List<ShiftTaskCompletion> detachmentCompletions = dto.getDetachmentId() == null
                ? List.of()
                : shiftTaskCompletionRepository.findAllByTaskIdAndDetachmentId(task.getId(), dto.getDetachmentId());

        ShiftTaskCompletion completion = dto.getDetachmentId() == null
                ? shiftTaskCompletionRepository
                    .findByTaskIdAndCounselorUserIdAndDetachmentId(task.getId(), actorUserId, dto.getDetachmentId())
                    .orElse(ShiftTaskCompletion.builder()
                            .task(task)
                            .counselorUserId(actorUserId)
                            .detachment(null)
                            .build())
                : detachmentCompletions.stream()
                    .max(Comparator.comparing(ShiftTaskCompletion::getCompletedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                            .thenComparing(ShiftTaskCompletion::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                    .orElse(ShiftTaskCompletion.builder()
                            .task(task)
                            .counselorUserId(actorUserId)
                            .detachment(detachment)
                            .build());

        completion.setCounselorUserId(actorUserId);
        completion.setCompleted(dto.isCompleted());
        completion.setComment(dto.getComment());
        completion.setCompletedAt(dto.isCompleted() ? OffsetDateTime.now() : null);

        ShiftTaskCompletion saved = shiftTaskCompletionRepository.save(completion);
        if (dto.getDetachmentId() != null && !detachmentCompletions.isEmpty()) {
            List<ShiftTaskCompletion> duplicates = detachmentCompletions.stream()
                    .filter(existing -> !existing.getId().equals(saved.getId()))
                    .toList();
            if (!duplicates.isEmpty()) {
                shiftTaskCompletionRepository.deleteAll(duplicates);
            }
        }

        auditEventService.log(
                task.getCamp().getId(),
                "SHIFT_TASK_COMPLETION_UPDATED",
                dto.isCompleted() ? "???????????? ???????????????? ?????? ??????????????????????" : "???????????? ?????????? ?? ????????????????????",
                "SHIFT_TASK",
                task.getId(),
                actorUserId,
                Map.of("taskId", task.getId().toString())
        );
        return mapCompletion(saved);
    }

    private ShiftTaskResponseDto mapTask(ShiftTask task, UUID actorUserId, UUID detachmentId) {
        long totalExpected;
        if (task.getTaskType() == ShiftTaskType.GENERAL) {
            totalExpected = campMemberSessionRepository.findBySessionIdAndAssignmentStatusAndActiveTrue(task.getSession().getId(), AssignmentStatus.ACCEPTED).stream()
                    .filter(a -> a.getSubRole() == StaffSubRole.COUNSELOR || a.getSubRole() == StaffSubRole.SENIOR_COUNSELOR)
                    .count();
            if (totalExpected == 0) totalExpected = 1;
        } else {
            totalExpected = counselorAssignmentRepository.findByDetachmentIdAndActiveTrue(task.getDetachment().getId()).size();
            if (totalExpected == 0) totalExpected = 1;
        }
        long totalCompleted = shiftTaskCompletionRepository.countByTaskIdAndCompletedTrue(task.getId());
        double percent = totalExpected == 0 ? 0.0 : (double) totalCompleted * 100.0 / (double) totalExpected;
        List<ShiftTaskCompletion> completions = shiftTaskCompletionRepository.findByTaskId(task.getId());

        List<ShiftTaskChecklistItemResponseDto> checklist = shiftTaskChecklistItemRepository.findByTaskIdOrderBySortOrderAsc(task.getId())
                .stream()
                .map(item -> ShiftTaskChecklistItemResponseDto.builder()
                        .id(item.getId())
                        .title(item.getTitle())
                        .required(item.isRequired())
                        .sortOrder(item.getSortOrder())
                        .build())
                .toList();
        Set<String> checklistIds = checklist.stream()
                .map(item -> String.valueOf(item.getId() == null ? item.getTitle() : item.getId()))
                .collect(java.util.stream.Collectors.toSet());

        List<ShiftTaskAttachmentResponseDto> attachments = shiftTaskAttachmentRepository.findByTaskIdOrderByCreatedAtAsc(task.getId())
                .stream()
                .map(att -> ShiftTaskAttachmentResponseDto.builder()
                        .id(att.getId())
                        .fileId(att.getFileId())
                        .originalFileName(att.getOriginalFileName())
                        .uploadedByUserId(att.getUploadedByUserId())
                        .createdAt(att.getCreatedAt())
                        .build())
                .toList();

        List<ShiftTaskDetachmentProgressDto> detachmentProgress = new ArrayList<>();
        List<Detachment> progressDetachments = task.getTaskType() == ShiftTaskType.DETACHMENT
                ? List.of(task.getDetachment())
                : detachmentRepository.findBySessionId(task.getSession().getId());

        for (Detachment progressDetachment : progressDetachments) {
            if (progressDetachment == null) continue;

            Set<String> checkedItemIds = completions.stream()
                    .filter(completion -> completion.getDetachment() != null)
                    .filter(completion -> progressDetachment.getId().equals(completion.getDetachment().getId()))
                    .map(ShiftTaskCompletion::getComment)
                    .filter(comment -> comment != null && !comment.isBlank())
                    .flatMap(comment -> parseCheckedItemIds(comment).stream())
                    .filter(checklistIds::contains)
                    .collect(java.util.stream.Collectors.toCollection(HashSet::new));

            long totalChecklistItems = checklist.isEmpty() ? 1 : checklist.size();
            long completedChecklistItems = checklist.isEmpty()
                    ? completions.stream()
                        .filter(ShiftTaskCompletion::isCompleted)
                        .filter(completion -> completion.getDetachment() != null)
                        .filter(completion -> progressDetachment.getId().equals(completion.getDetachment().getId()))
                        .count()
                    : checkedItemIds.size();

            double detachmentPercent = totalChecklistItems == 0 ? 0.0 : (double) completedChecklistItems * 100.0 / (double) totalChecklistItems;

            detachmentProgress.add(ShiftTaskDetachmentProgressDto.builder()
                    .detachmentId(progressDetachment.getId())
                    .detachmentName(progressDetachment.getName())
                    .totalChecklistItems(totalChecklistItems)
                    .completedChecklistItems(completedChecklistItems)
                    .completionPercent(detachmentPercent)
                    .build());
        }

        ShiftTaskCompletion currentUserCompletion = null;
        String currentCompletionComment = null;
        boolean currentCompletionCompleted = false;
        OffsetDateTime currentCompletionCompletedAt = null;
        if (detachmentId != null) {
            List<ShiftTaskCompletion> currentDetachmentCompletions = completions.stream()
                    .filter(completion -> completion.getDetachment() != null)
                    .filter(completion -> detachmentId.equals(completion.getDetachment().getId()))
                    .toList();

            currentUserCompletion = currentDetachmentCompletions.stream()
                    .max(Comparator.comparing(ShiftTaskCompletion::getCompletedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                            .thenComparing(ShiftTaskCompletion::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                    .orElse(null);

            Set<String> currentCheckedItemIds = currentDetachmentCompletions.stream()
                    .map(ShiftTaskCompletion::getComment)
                    .filter(comment -> comment != null && !comment.isBlank())
                    .flatMap(comment -> parseCheckedItemIds(comment).stream())
                    .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

            currentCompletionComment = currentCheckedItemIds.isEmpty()
                    ? null
                    : OBJECT_MAPPER.createObjectNode().putPOJO("checkedItemIds", currentCheckedItemIds).toString();
            currentCompletionCompleted = checklist.isEmpty()
                    ? currentDetachmentCompletions.stream().anyMatch(ShiftTaskCompletion::isCompleted)
                    : currentCheckedItemIds.size() >= checklist.size();
            currentCompletionCompletedAt = currentDetachmentCompletions.stream()
                    .map(ShiftTaskCompletion::getCompletedAt)
                    .filter(java.util.Objects::nonNull)
                    .max(OffsetDateTime::compareTo)
                    .orElse(null);
        } else if (actorUserId != null) {
            currentUserCompletion = shiftTaskCompletionRepository
                    .findByTaskIdAndCounselorUserIdAndDetachmentId(task.getId(), actorUserId, null)
                    .orElse(null);
            currentCompletionComment = currentUserCompletion == null ? null : currentUserCompletion.getComment();
            currentCompletionCompleted = currentUserCompletion != null && currentUserCompletion.isCompleted();
            currentCompletionCompletedAt = currentUserCompletion == null ? null : currentUserCompletion.getCompletedAt();
        }

        return ShiftTaskResponseDto.builder()
                .id(task.getId())
                .campId(task.getCamp().getId())
                .campName(task.getCamp().getName())
                .sessionId(task.getSession().getId())
                .sessionTitle(task.getSession().getTitle())
                .detachmentId(task.getDetachment() == null ? null : task.getDetachment().getId())
                .detachmentName(task.getDetachment() == null ? null : task.getDetachment().getName())
                .taskType(task.getTaskType())
                .targetDate(task.getTargetDate())
                .title(task.getTitle())
                .description(task.getDescription())
                .createdByUserId(task.getCreatedByUserId())
                .createdAt(task.getCreatedAt())
                .totalExpected(totalExpected)
                .totalCompleted(totalCompleted)
                .completionPercent(percent)
                .completedByCurrentUser(currentCompletionCompleted)
                .currentUserCompletedAt(currentCompletionCompletedAt)
                .currentUserCompletionComment(currentCompletionComment)
                .checklistItems(checklist)
                .attachments(attachments)
                .detachmentProgress(detachmentProgress)
                .build();
    }

    private List<String> parseCheckedItemIds(String comment) {
        try {
            JsonNode root = OBJECT_MAPPER.readTree(comment);
            JsonNode checked = root.get("checkedItemIds");
            if (checked == null || !checked.isArray()) {
                return List.of();
            }
            List<String> result = new ArrayList<>();
            checked.forEach(node -> result.add(node.asText()));
            return result;
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private ShiftTaskCompletionResponseDto mapCompletion(ShiftTaskCompletion completion) {
        return ShiftTaskCompletionResponseDto.builder()
                .id(completion.getId())
                .taskId(completion.getTask().getId())
                .counselorUserId(completion.getCounselorUserId())
                .detachmentId(completion.getDetachment() == null ? null : completion.getDetachment().getId())
                .completed(completion.isCompleted())
                .completedAt(completion.getCompletedAt())
                .comment(completion.getComment())
                .build();
    }
}
