CREATE TABLE IF NOT EXISTS admin_subscriptions (
                                                   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                   user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                                                   expires_at  TIMESTAMPTZ NOT NULL,
                                                   active      BOOLEAN NOT NULL DEFAULT true,
                                                   payment_id  VARCHAR(100) UNIQUE,
                                                   created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индекс для быстрой выборки в шедулере
CREATE INDEX IF NOT EXISTS idx_admin_sub_active_expires
    ON admin_subscriptions(active, expires_at)
    WHERE active = true;