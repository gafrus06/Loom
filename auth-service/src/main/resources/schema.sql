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

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_pending
    ON outbox_events(created_at)
    WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id VARCHAR(100) NOT NULL UNIQUE,
    request_key VARCHAR(100) NOT NULL UNIQUE,
    payment_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    confirmation_url TEXT,
    entitlement_applied BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_status
    ON subscription_payments(user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS subscription_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_key VARCHAR(64) NOT NULL UNIQUE,
    payment_id VARCHAR(100),
    event_type VARCHAR(100),
    raw_body TEXT NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
