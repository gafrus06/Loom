-- V3__child_applications.sql

-- Привязка родителей к лагерю через код приглашения
CREATE TABLE camp_parents (
                              id              UUID PRIMARY KEY,
                              camp_id         UUID        NOT NULL,
                              parent_user_id  UUID        NOT NULL,
                              joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                              CONSTRAINT uk_camp_parents_camp_user UNIQUE (camp_id, parent_user_id),
                              CONSTRAINT fk_camp_parents_camp FOREIGN KEY (camp_id) REFERENCES camps(id) ON DELETE CASCADE
);

CREATE INDEX ix_camp_parents_camp   ON camp_parents(camp_id);
CREATE INDEX ix_camp_parents_parent ON camp_parents(parent_user_id);

-- Коды приглашения для лагеря
CREATE TABLE camp_invite_codes (
                                   id          UUID PRIMARY KEY,
                                   camp_id     UUID        NOT NULL,
                                   code        VARCHAR(20) NOT NULL UNIQUE,
                                   active      BOOLEAN     NOT NULL DEFAULT TRUE,
                                   created_by  UUID        NOT NULL,
                                   created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

                                   CONSTRAINT fk_invite_camp FOREIGN KEY (camp_id) REFERENCES camps(id) ON DELETE CASCADE
);

CREATE INDEX ix_invite_code ON camp_invite_codes(code);
CREATE INDEX ix_invite_camp  ON camp_invite_codes(camp_id);

-- Заявки родителей на детей
CREATE TABLE child_applications (
                                    id                UUID         PRIMARY KEY,
                                    camp_id           UUID         NOT NULL,
                                    parent_user_id    UUID         NOT NULL,
                                    first_name        VARCHAR(100) NOT NULL,
                                    last_name         VARCHAR(100) NOT NULL,
                                    birth_date        DATE         NOT NULL,
                                    gender            VARCHAR(10),
                                    home_city         VARCHAR(100),
                                    medical_notes     VARCHAR(1000),
                                    allergies         VARCHAR(500),
                                    special_needs     VARCHAR(500),
                                    behavioral_notes  VARCHAR(1000),
                                    relation          VARCHAR(50),
                                    status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
                                    child_id          UUID,
                                    confirmed_by      UUID,
                                    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                                    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

                                    CONSTRAINT fk_app_camp FOREIGN KEY (camp_id) REFERENCES camps(id) ON DELETE CASCADE
);

CREATE INDEX ix_child_app_camp   ON child_applications(camp_id);
CREATE INDEX ix_child_app_parent ON child_applications(parent_user_id);
CREATE INDEX ix_child_app_status ON child_applications(status);