-- V1__init.sql
-- Полная инициализация схемы user-service

CREATE TABLE IF NOT EXISTS users (
                                     id              UUID         PRIMARY KEY,
                                     email           VARCHAR(100) NOT NULL UNIQUE,
                                     first_name      VARCHAR(255),
                                     second_name     VARCHAR(255),
                                     third_name      VARCHAR(255),
                                     phone           VARCHAR(16),
                                     phone_verified  BOOLEAN      NOT NULL DEFAULT FALSE,
                                     avatar_file_id  UUID,
                                     created_at      TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parents (
                                       id                      BIGSERIAL   PRIMARY KEY,
                                       user_id                 UUID        NOT NULL UNIQUE,
                                       emergency_contact_name  VARCHAR(100),
                                       emergency_contact_phone VARCHAR(20),
                                       address                 VARCHAR(255),
                                       notes                   TEXT,
                                       CONSTRAINT fk_parent_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS counselors (
                                          id                      BIGSERIAL       PRIMARY KEY,
                                          user_id                 UUID            NOT NULL UNIQUE,
                                          specialization          VARCHAR(255),
                                          experience_years        BIGINT,
                                          bio                     VARCHAR(2000),
                                          education_document_ids  VARCHAR(2000),
                                          telegram                VARCHAR(255),
                                          shift_preference        VARCHAR(255),
                                          CONSTRAINT fk_counselor_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_profiles (
                                              id      BIGSERIAL   PRIMARY KEY,
                                              user_id UUID        NOT NULL UNIQUE,
                                              CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);