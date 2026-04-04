package ru.funkids.campservice.entity;

/**
 * Подроль сотрудника внутри конкретной смены.
 * Глобальная роль пользователя живёт вне camp-service,
 * а здесь хранится именно контекстная роль в рамках смены.
 */
public enum StaffSubRole {
    COUNSELOR,
    SENIOR_COUNSELOR,
    MEDICAL_WORKER
}
