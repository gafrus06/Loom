create table if not exists processed_inbound_events (
    event_id uuid primary key,
    source_topic varchar(255) not null,
    processed_at timestamptz not null default now()
);

create index if not exists idx_processed_inbound_events_processed_at
    on processed_inbound_events(processed_at);
