package ru.funkids.campservice.dto;

import ru.funkids.campservice.entity.ApplicationStatus;
import ru.funkids.campservice.entity.Gender;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

// ── Ответ — заявка для вожатого ────────────────────────────────────
public record ChildApplicationResponseDto(
        UUID id,
        UUID campId,
        UUID parentUserId,
        String parentName,       // подтягивается из user-service
        String firstName,
        String lastName,
        LocalDate birthDate,
        Gender gender,
        String homeCity,
        String medicalNotes,
        String allergies,
        String specialNeeds,
        String behavioralNotes,
        String relation,
        ApplicationStatus status,
        UUID childId,
        OffsetDateTime createdAt
) {}
