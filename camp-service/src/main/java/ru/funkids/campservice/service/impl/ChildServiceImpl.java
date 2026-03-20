package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.ChildCreateDto;
import ru.funkids.campservice.dto.ChildResponseDto;
import ru.funkids.campservice.dto.ChildUpdateDto;
import ru.funkids.campservice.entity.Child;
import ru.funkids.campservice.entity.Detachment;
import ru.funkids.campservice.entity.DetachmentMembership;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.ChildRepository;
import ru.funkids.campservice.repository.DetachmentRepository;
import ru.funkids.campservice.repository.ParentLinkRepository;
import ru.funkids.campservice.service.AuditEventService;
import ru.funkids.campservice.service.ChildService;
import ru.funkids.campservice.security.DetachmentSecurityService;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ChildServiceImpl implements ChildService {

    private final ChildRepository childRepository;
    private final DetachmentRepository detachmentRepository;
    private final ParentLinkRepository parentLinkRepository;
    private final DetachmentSecurityService securityService;
    private final AuditEventService auditEventService;

    // =========================================================================
    // Создание карточки ребёнка (только вожатый отряда или ADMIN)
    // =========================================================================

    @Override
    public ChildResponseDto create(ChildCreateDto dto, UUID creatorUserId) {
        log.info("Creating child: {} {} by user: {}", dto.getFirstName(), dto.getLastName(), creatorUserId);

        Child child = Child.builder()
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .birthDate(dto.getBirthDate())
                .gender(dto.getGender())
                .homeCity(dto.getHomeCity())
                .createdByUserId(creatorUserId)
                .parentVerified(false)
                .build();

        if (dto.getDetachmentId() != null) {
            // Проверяем право изменять отряд (создание карточки = изменение)
            securityService.checkCanModifyDetachment(dto.getDetachmentId(), creatorUserId);

            Detachment detachment = detachmentRepository.findById(dto.getDetachmentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Отряд не найден: " + dto.getDetachmentId()));

            DetachmentMembership membership = DetachmentMembership.builder()
                    .detachment(detachment)
                    .child(child)
                    .build();

            child.getMemberships().add(membership);

            UUID campId = detachment.getSession().getCamp().getId();

            Child saved = childRepository.save(child);
            log.info("Child created: {}", saved.getId());

            auditEventService.log(
                    campId,
                    "CHILD_ADDED_TO_DETACHMENT",
                    "Ребёнок " + dto.getFirstName() + " " + dto.getLastName()
                            + " добавлен в отряд «" + detachment.getName() + "»",
                    "CHILD",
                    saved.getId(),
                    creatorUserId,
                    Map.of("detachmentId", dto.getDetachmentId().toString())
            );

            return mapToFullDto(saved);
        }

        Child saved = childRepository.save(child);
        log.info("Child created (no detachment): {}", saved.getId());
        return mapToFullDto(saved);
    }

    // =========================================================================
    // Получение полной карточки (вожатый отряда, ADMIN, родитель своего ребёнка)
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public ChildResponseDto get(UUID id) {
        Child child = childRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ребёнок не найден: " + id));
        return mapToFullDto(child);
    }

    /**
     * Полная карточка с проверкой прав.
     * Если у запрашивающего нет доступа — бросает AccessDeniedException.
     */
    @Transactional(readOnly = true)
    public ChildResponseDto getWithAccessCheck(UUID id, UUID requesterId) {
        Child child = childRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ребёнок не найден: " + id));

        securityService.checkCanViewFullChildCard(id, requesterId);

        return mapToFullDto(child);
    }

    /**
     * Краткая карточка: только имя и фамилия.
     * Используется когда родитель смотрит список детей в отряде —
     * имена видит, подробные данные — нет.
     */
    @Transactional(readOnly = true)
    public ChildResponseDto getSummary(UUID id) {
        Child child = childRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ребёнок не найден: " + id));
        return mapToSummaryDto(child);
    }

    // =========================================================================
    // Обновление карточки
    //
    // Два режима:
    //   updateByStaff  — вожатый/ADMIN, может менять всё
    //   updateByParent — родитель, может менять только свои поля
    //                    (медицинские данные, аллергии и т.д.)
    // =========================================================================

    @Override
    public ChildResponseDto update(UUID id, ChildUpdateDto dto, UUID updaterUserId) {
        // Устаревший метод без проверки — используй updateByStaff или updateByParent
        return updateByStaff(id, dto, updaterUserId);
    }

    /**
     * Обновление вожатым или ADMIN-ом.
     * Требует быть членом отряда ребёнка или ADMIN-ом лагеря.
     */
    public ChildResponseDto updateByStaff(UUID id, ChildUpdateDto dto, UUID staffUserId) {
        log.info("Staff {} updating child {}", staffUserId, id);

        Child child = childRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ребёнок не найден: " + id));

        // Проверяем доступ через отряд
        securityService.checkCanViewFullChildCard(id, staffUserId);

        applyAllUpdates(child, dto);
        Child updated = childRepository.save(child);
        return mapToFullDto(updated);
    }

    /**
     * Обновление родителем.
     * Родитель может менять только карточку своего ребёнка.
     * Поля firstName, lastName, birthDate — родитель НЕ может менять
     * (они проставлены вожатым при подтверждении заявки).
     * Родитель может менять: медицинские данные, аллергии, особые потребности,
     * поведенческие заметки, город.
     */
    public ChildResponseDto updateByParent(UUID id, ChildUpdateDto dto, UUID parentUserId) {
        log.info("Parent {} updating child {}", parentUserId, id);

        securityService.checkCanParentUpdateChild(id, parentUserId);

        Child child = childRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ребёнок не найден: " + id));

        applyAllUpdates(child, dto);
        Child updated = childRepository.save(child);
        return mapToFullDto(updated);
    }

    // =========================================================================
    // Удаление (только вожатый/ADMIN)
    // =========================================================================

    @Override
    public void delete(UUID id) {
        log.info("Deleting child: {}", id);
        if (!childRepository.existsById(id)) {
            throw new ResourceNotFoundException("Ребёнок не найден: " + id);
        }
        childRepository.deleteById(id);
    }

    // =========================================================================
    // Вспомогательные методы обновления
    // =========================================================================

    /** Применить все поля из DTO (для вожатого/ADMIN) */
    private void applyAllUpdates(Child child, ChildUpdateDto dto) {
        if (dto.getFirstName()     != null) child.setFirstName(dto.getFirstName());
        if (dto.getLastName()      != null) child.setLastName(dto.getLastName());
        if (dto.getBirthDate()     != null) child.setBirthDate(dto.getBirthDate());
        if (dto.getGender()        != null) child.setGender(dto.getGender());
        if (dto.getHomeCity()      != null) child.setHomeCity(dto.getHomeCity());
        applyParentUpdates(child, dto);
    }

    /** Применить только поля, которые разрешено менять родителю */
    private void applyParentUpdates(Child child, ChildUpdateDto dto) {
        if (dto.getMedicalNotes()   != null) { child.setMedicalNotes(dto.getMedicalNotes());   child.setParentVerified(true); }
        if (dto.getAllergies()       != null) { child.setAllergies(dto.getAllergies());           child.setParentVerified(true); }
        if (dto.getSpecialNeeds()   != null) { child.setSpecialNeeds(dto.getSpecialNeeds());     child.setParentVerified(true); }
        if (dto.getBehavioralNotes()!= null) { child.setBehavioralNotes(dto.getBehavioralNotes()); child.setParentVerified(true); }
        if (dto.getHomeCity()       != null)   child.setHomeCity(dto.getHomeCity());
        if (dto.getAvatarFileId()   != null)   child.setAvatarFileId(dto.getAvatarFileId());
    }

    // =========================================================================
    // Маппинг
    // =========================================================================

    /** Полная карточка со всеми полями — для вожатых, ADMIN и родителя своего ребёнка */
    private ChildResponseDto mapToFullDto(Child child) {
        return ChildResponseDto.builder()
                .id(child.getId())
                .firstName(child.getFirstName())
                .lastName(child.getLastName())
                .birthDate(child.getBirthDate())
                .age(child.getAge())
                .gender(child.getGender())
                .homeCity(child.getHomeCity())
                .medicalNotes(child.getMedicalNotes())
                .allergies(child.getAllergies())
                .specialNeeds(child.getSpecialNeeds())
                .behavioralNotes(child.getBehavioralNotes())
                .avatarFileId(child.getAvatarFileId())
                .createdByUserId(child.getCreatedByUserId())
                .parentVerified(child.isParentVerified())
                .createdAt(child.getCreatedAt())
                .updatedAt(child.getUpdatedAt())
                .build();
    }

    /**
     * Краткая карточка — только имя и фамилия.
     * Используется при показе списка детей отряда родителю.
     * Все чувствительные поля null.
     */
    private ChildResponseDto mapToSummaryDto(Child child) {
        return ChildResponseDto.builder()
                .id(child.getId())
                .firstName(child.getFirstName())
                .lastName(child.getLastName())
                // всё остальное null — намеренно
                .build();
    }
}