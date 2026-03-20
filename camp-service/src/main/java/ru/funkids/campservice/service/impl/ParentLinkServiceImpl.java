package ru.funkids.campservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.campservice.dto.ParentLinkCreateDto;
import ru.funkids.campservice.dto.ParentLinkResponseDto;
import ru.funkids.campservice.entity.Child;
import ru.funkids.campservice.entity.ParentLink;
import ru.funkids.campservice.entity.ParentLinkId;
import ru.funkids.campservice.exception.ResourceNotFoundException;
import ru.funkids.campservice.repository.ChildRepository;
import ru.funkids.campservice.repository.ParentLinkRepository;
import ru.funkids.campservice.service.ParentLinkService;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ParentLinkServiceImpl implements ParentLinkService {

    private final ParentLinkRepository parentLinkRepository;
    private final ChildRepository childRepository;
    // TODO: Add Feign Client for Auth Service to assign ROLE_PARENT

    @Override
    public ParentLinkResponseDto link(ParentLinkCreateDto dto) {
        log.info("Linking parent {} to child {}", dto.getParentUserId(), dto.getChildId());

        Child child = childRepository.findById(dto.getChildId())
                .orElseThrow(() -> new ResourceNotFoundException("Child not found with id: " + dto.getChildId()));

        ParentLinkId id = new ParentLinkId(dto.getChildId(), dto.getParentUserId());

        ParentLink link = ParentLink.builder()
                .id(id)
                .child(child)
                .relation(dto.getRelation())
                .build();

        ParentLink saved = parentLinkRepository.save(link);
        log.info("Parent link created");

        // TODO: Call Auth Service to assign ROLE_PARENT to parentUserId
        // TODO: Send notification to parent email

        return mapToDto(saved);
    }

    @Override
    public void unlink(UUID childId, UUID parentUserId) {
        log.info("Unlinking parent {} from child {}", parentUserId, childId);

        ParentLinkId id = new ParentLinkId(childId, parentUserId);

        if (!parentLinkRepository.existsById(id)) {
            throw new ResourceNotFoundException("Parent link not found");
        }

        parentLinkRepository.deleteById(id);
        log.info("Parent link removed");
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParentLinkResponseDto> listByChild(UUID childId) {
        return parentLinkRepository.findByIdChildId(childId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParentLinkResponseDto> listByParent(UUID parentUserId) {
        return parentLinkRepository.findByIdParentUserId(parentUserId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private ParentLinkResponseDto mapToDto(ParentLink link) {
        return ParentLinkResponseDto.builder()
                .childId(link.getId().getChildId())
                .parentUserId(link.getId().getParentUserId())
                .relation(link.getRelation())
                .build();
    }
}