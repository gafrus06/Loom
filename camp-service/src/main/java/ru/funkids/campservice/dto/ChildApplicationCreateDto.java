package ru.funkids.campservice.dto;

import ru.funkids.campservice.entity.Gender;

import java.time.LocalDate;

// ── Создание заявки родителем ──────────────────────────────────────
public record ChildApplicationCreateDto(
        String firstName,
        String lastName,
        LocalDate birthDate,
        Gender gender,
        String homeCity,
        String medicalNotes,
        String allergies,
        String specialNeeds,
        String behavioralNotes,
        String relation  // Мама / Папа / Опекун
) {
}

