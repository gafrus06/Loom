package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import ru.fun.userservice.config.RedisConfig.CacheNames;
import ru.fun.userservice.dto.CounselorProfileDto;
import ru.fun.userservice.dto.EditCounselorProfileRequest;
import ru.fun.userservice.entity.CounselorProfile;
import ru.fun.userservice.repository.CounselorProfileRepository;
import ru.fun.userservice.repository.UserProfileRepository;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CounselorProfileService {

    private final CounselorProfileRepository repo;
    private final UserProfileRepository users;

    @Cacheable(cacheNames = CacheNames.COUNSELOR_BY_USER_ID, key = "#userId", unless = "#result == null")
    public CounselorProfileDto getDto(UUID userId) {
        return repo.findByUserProfile_Id(userId)
                .map(this::toDto)
                .orElse(null);
    }

    @Transactional
    @CachePut(cacheNames = CacheNames.COUNSELOR_BY_USER_ID, key = "#userId")
    public CounselorProfileDto upsert(UUID userId, EditCounselorProfileRequest req) {
        var user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        var c = repo.findByUserProfile_Id(userId)
                .orElseGet(() -> CounselorProfile.builder().userProfile(user).build());

        c.setSpecialization(req.getSpecialization());
        c.setExperienceYears(req.getExperienceYears());
        c.setBio(req.getBio());
        c.setEducationDocumentIds(req.getEducationDocumentIds());
        c.setTelegram(req.getTelegram());
        c.setShiftPreference(req.getShiftPreference());

        return toDto(repo.save(c));
    }

    @Transactional
    @CachePut(cacheNames = CacheNames.COUNSELOR_BY_USER_ID, key = "#userId")
    public CounselorProfileDto addEducationDocument(UUID userId, UUID fileId) {
        var user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        var c = repo.findByUserProfile_Id(userId)
                .orElseGet(() -> CounselorProfile.builder().userProfile(user).build());

        List<String> ids = parseIds(c.getEducationDocumentIds());
        String fid = fileId.toString();
        if (!ids.contains(fid)) {
            ids.add(fid);
        }
        c.setEducationDocumentIds(String.join(",", ids));

        return toDto(repo.save(c));
    }

    @Transactional
    @CacheEvict(cacheNames = CacheNames.COUNSELOR_BY_USER_ID, key = "#userId")
    public CounselorProfileDto removeEducationDocument(UUID userId, UUID fileId) {
        var c = repo.findByUserProfile_Id(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Counselor profile not found"));

        List<String> ids = parseIds(c.getEducationDocumentIds());
        ids.remove(fileId.toString());
        c.setEducationDocumentIds(ids.isEmpty() ? null : String.join(",", ids));

        return toDto(repo.save(c));
    }

    @Transactional
    @CacheEvict(cacheNames = CacheNames.COUNSELOR_BY_USER_ID, key = "#userId")
    public void deleteByUserId(UUID userId) {
        repo.findByUserProfile_Id(userId).ifPresent(repo::delete);
    }

    private List<String> parseIds(String raw) {
        if (raw == null || raw.isBlank()) return new ArrayList<>();
        return new ArrayList<>(Arrays.asList(raw.split(",")));
    }

    private CounselorProfileDto toDto(CounselorProfile c) {
        return CounselorProfileDto.builder()
                .specialization(c.getSpecialization())
                .experienceYears(c.getExperienceYears())
                .bio(c.getBio())
                .educationDocumentIds(c.getEducationDocumentIds())
                .telegram(c.getTelegram())
                .shiftPreference(c.getShiftPreference())
                .countOfCompletedShifts(c.getCountOfCompletedShifts())
                .rating(c.getRating())
                .ratingCount(c.getRatingCount())
                .build();
    }
}
