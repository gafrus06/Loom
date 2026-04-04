package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ru.fun.userservice.dto.EditParentProfileRequest;
import ru.fun.userservice.entity.ParentProfile;
import ru.fun.userservice.repository.ParentProfileRepository;
import ru.fun.userservice.repository.UserProfileRepository;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ParentProfileService {

    private final ParentProfileRepository repo;
    private final UserProfileRepository users;

    @Transactional
    public ParentProfile upsert(UUID userId, EditParentProfileRequest req) {
        var user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User " + userId + " not found"));

        var entity = repo.findByUserProfile_Id(userId)
                .orElseGet(() -> ParentProfile.builder().userProfile(user).build());

        entity.setEmergencyContactName(req.getEmergencyContactName());
        entity.setEmergencyContactPhone(req.getEmergencyContactPhone());
        entity.setEmergencyContactRelation(req.getEmergencyContactRelation());
        entity.setAddress(req.getAddress());
        entity.setNotes(req.getNotes());

        return repo.save(entity);
    }

    public Optional<ParentProfile> get(UUID userId) {
        return repo.findByUserProfile_Id(userId);
    }
}
