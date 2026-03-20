-- =============================================================================
-- Миграция: новая модель доступа и аудита
-- =============================================================================
-- Порядок выполнения важен из-за FK-зависимостей.
-- Все изменения обратно совместимы (additive), кроме:
--   - camp_parents: добавляется NOT NULL поле session_id
--     → сначала добавляем с DEFAULT NULL, заполняем, потом ставим NOT NULL
--   - counselor_assignments.role_in_detachment: тип меняется с VARCHAR (свободный)
--     на ENUM-строку ('LEAD' / 'ASSISTANT')
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Новая таблица: camp_member_sessions
--    Привязка вожатого (CampMember) к конкретным сменам.
--    ADMIN (OWNER) записей сюда не получает — его доступ по роли.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS camp_member_sessions (
                                                    id             UUID         NOT NULL DEFAULT gen_random_uuid(),
                                                    camp_member_id UUID         NOT NULL,
                                                    session_id     UUID         NOT NULL,
                                                    assigned_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

                                                    CONSTRAINT pk_camp_member_sessions            PRIMARY KEY (id),
                                                    CONSTRAINT uk_camp_member_sessions_member_session
                                                        UNIQUE (camp_member_id, session_id),
                                                    CONSTRAINT fk_cms_camp_member
                                                        FOREIGN KEY (camp_member_id) REFERENCES camp_members(id) ON DELETE CASCADE,
                                                    CONSTRAINT fk_cms_session
                                                        FOREIGN KEY (session_id)     REFERENCES sessions(id)     ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_cms_member  ON camp_member_sessions (camp_member_id);
CREATE INDEX IF NOT EXISTS ix_cms_session ON camp_member_sessions (session_id);

COMMENT ON TABLE  camp_member_sessions                IS 'Привязка вожатого к конкретным сменам лагеря';
COMMENT ON COLUMN camp_member_sessions.camp_member_id IS 'Ссылка на запись CampMember (вожатый в лагере)';
COMMENT ON COLUMN camp_member_sessions.session_id     IS 'Смена, к которой назначен вожатый';


-- -----------------------------------------------------------------------------
-- 2. Изменение camp_parents: добавить session_id
--    Родитель теперь привязан к конкретной смене, а не только к лагерю.
-- -----------------------------------------------------------------------------

-- Шаг 2.1: добавляем поле (nullable временно)
ALTER TABLE camp_parents
    ADD COLUMN IF NOT EXISTS session_id UUID;

-- Шаг 2.2: для существующих записей пытаемся проставить первую смену лагеря.
--   Если смен нет — запись останется с NULL и будет удалена или исправлена вручную.
UPDATE camp_parents cp
SET session_id = (
    SELECT s.id
    FROM sessions s
    WHERE s.camp_id = cp.camp_id
    ORDER BY s.start_date
    LIMIT 1
)
WHERE cp.session_id IS NULL;

-- Шаг 2.3: делаем поле NOT NULL
ALTER TABLE camp_parents
    ALTER COLUMN session_id SET NOT NULL;

-- Шаг 2.4: удаляем старый unique constraint (только по camp + parent)
--   и добавляем новый (по camp + session + parent)
ALTER TABLE camp_parents
    DROP CONSTRAINT IF EXISTS uk_camp_parents_camp_user;

ALTER TABLE camp_parents
    ADD CONSTRAINT uk_camp_parents_camp_session_user
        UNIQUE (camp_id, session_id, parent_user_id);

-- Шаг 2.5: добавляем FK и индекс по session_id
ALTER TABLE camp_parents
    ADD CONSTRAINT fk_camp_parents_session
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ix_camp_parents_session ON camp_parents (session_id);

COMMENT ON COLUMN camp_parents.session_id IS
    'Смена, к которой привязан родитель. Инвайт-код теперь выдаётся на уровне смены.';


-- -----------------------------------------------------------------------------
-- 3. counselor_assignments: нормализация role_in_detachment
--    Меняем свободные строки ('Главный', 'Помощник') на стандартные ('LEAD', 'ASSISTANT').
-- -----------------------------------------------------------------------------

-- Шаг 3.1: обновляем существующие значения
UPDATE counselor_assignments
SET role_in_detachment = 'LEAD'
WHERE role_in_detachment IN ('Главный', 'MAIN', 'LEAD', 'lead', 'главный');

UPDATE counselor_assignments
SET role_in_detachment = 'ASSISTANT'
WHERE role_in_detachment NOT IN ('LEAD');

-- Шаг 3.2: добавляем CHECK-ограничение для защиты от некорректных значений
ALTER TABLE counselor_assignments
    DROP CONSTRAINT IF EXISTS chk_counselor_role;

ALTER TABLE counselor_assignments
    ADD CONSTRAINT chk_counselor_role
        CHECK (role_in_detachment IN ('LEAD', 'ASSISTANT'));

-- Шаг 3.3: дополнительный индекс для быстрой проверки роли вожатого в отряде
CREATE INDEX IF NOT EXISTS ix_counselor_active
    ON counselor_assignments (detachment_id, user_id, active);

COMMENT ON COLUMN counselor_assignments.role_in_detachment IS
    'Роль вожатого в отряде: LEAD (главный, создатель) или ASSISTANT (помощник)';


-- -----------------------------------------------------------------------------
-- 4. audit_events: добавить camp_id и description
-- -----------------------------------------------------------------------------

ALTER TABLE audit_events
    ADD COLUMN IF NOT EXISTS camp_id     UUID,
    ADD COLUMN IF NOT EXISTS description VARCHAR(500);

-- Индекс для фильтрации ленты событий по лагерю (основной запрос аналитики)
CREATE INDEX IF NOT EXISTS ix_audit_camp ON audit_events (camp_id);

COMMENT ON COLUMN audit_events.camp_id     IS 'Лагерь, в котором произошло событие — ключ для аналитики';
COMMENT ON COLUMN audit_events.description IS
    'Человекочитаемое описание без UUID, например: "Отряд «Орлята» перешёл на этап: Деловой"';

-- Обновляем существующие записи: пытаемся проставить camp_id из связанной сущности
-- (только для DETACHMENT-событий — самый частый случай)
UPDATE audit_events ae
SET camp_id = (
    SELECT d.session_id  -- промежуточно берём через detachment
    FROM detachments d
    WHERE d.id = ae.entity_id
    LIMIT 1
)
WHERE ae.camp_id IS NULL
  AND ae.entity_type = 'DETACHMENT';

-- Для SESSION-событий
UPDATE audit_events ae
SET camp_id = (
    SELECT s.camp_id
    FROM sessions s
    WHERE s.id = ae.entity_id
    LIMIT 1
)
WHERE ae.camp_id IS NULL
  AND ae.entity_type = 'SESSION';


-- -----------------------------------------------------------------------------
-- 6. camp_invite_codes: добавить session_id
--    Инвайт-код теперь выдаётся на уровне смены, а не лагеря в целом.
-- -----------------------------------------------------------------------------

ALTER TABLE camp_invite_codes
    ADD COLUMN IF NOT EXISTS session_id UUID;

-- Для существующих кодов проставляем первую смену лагеря
UPDATE camp_invite_codes cic
SET session_id = (
    SELECT s.id FROM sessions s
    WHERE s.camp_id = cic.camp_id
    ORDER BY s.start_date
    LIMIT 1
)
WHERE cic.session_id IS NULL;

ALTER TABLE camp_invite_codes
    ALTER COLUMN session_id SET NOT NULL;

ALTER TABLE camp_invite_codes
    ADD CONSTRAINT fk_invite_code_session
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ix_invite_session ON camp_invite_codes (session_id);

COMMENT ON COLUMN camp_invite_codes.session_id IS
    'Смена, к которой привязывает этот инвайт-код родителя';


-- -----------------------------------------------------------------------------
-- 7. camp_members: добавить removed_at (мягкое удаление)
--    В старой схеме поля removedAt не было — добавляем.
-- -----------------------------------------------------------------------------

ALTER TABLE camp_members
    ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;

COMMENT ON COLUMN camp_members.removed_at IS 'Дата исключения вожатого из лагеря (мягкое удаление)';


-- -----------------------------------------------------------------------------
-- 8. Итоговая проверка
-- -----------------------------------------------------------------------------

DO $$
    BEGIN
        -- Убеждаемся, что новые таблицы и колонки существуют
        ASSERT (SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'camp_member_sessions'
        )), 'Таблица camp_member_sessions не создана';

        ASSERT (SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'camp_parents' AND column_name = 'session_id'
        )), 'Колонка camp_parents.session_id не добавлена';

        ASSERT (SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'camp_invite_codes' AND column_name = 'session_id'
        )), 'Колонка camp_invite_codes.session_id не добавлена';

        ASSERT (SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'audit_events' AND column_name = 'camp_id'
        )), 'Колонка audit_events.camp_id не добавлена';

        ASSERT (SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'audit_events' AND column_name = 'description'
        )), 'Колонка audit_events.description не добавлена';

        RAISE NOTICE 'Миграция прошла успешно';
    END;
$$;