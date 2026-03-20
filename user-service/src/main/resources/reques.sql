ALTER TABLE users
    ALTER COLUMN phone TYPE varchar(16),
    ADD CONSTRAINT chk_users_phone_e164
        CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{1,14}$');
