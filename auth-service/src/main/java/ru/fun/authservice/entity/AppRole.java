package ru.fun.authservice.entity;

/**
 * Все поддерживаемые роли системы.
 *
 * Роли не хранятся в БД как отдельная таблица — они фиксированы здесь.
 * В таблице user_roles хранятся строки (name()) вместе с метаданными назначения.
 *
 * Иерархия назначения (кто может выдать какую роль):
 *   SUPER_ADMIN → любую роль кому угодно, включая SUPER_ADMIN
 *   ADMIN       → ROLE_COUNSELOR, ROLE_PARENT
 *   COUNSELOR   → ROLE_PARENT
 *   остальные   → не могут выдавать роли
 *
 * Снятие роли:
 *   - только тот, кто роль назначил (assignedByUserId)
 *   - либо SUPER_ADMIN — без ограничений
 *   - ROLE_USER снять нельзя (базовая роль)
 */
public enum AppRole {

    ROLE_USER,        // базовая роль — выдаётся автоматически при регистрации
    ROLE_PARENT,      // родитель ребёнка
    ROLE_COUNSELOR,   // вожатый
    ROLE_ADMIN,       // администратор лагеря
    ROLE_SUPER_ADMIN; // системный оператор, полный доступ

    public String value() {
        return this.name();
    }

    /**
     * Безопасный парсинг строки в AppRole.
     * Возвращает null если строка не соответствует ни одной роли.
     */
    public static AppRole fromString(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return AppRole.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}