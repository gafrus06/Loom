create table if not exists dead_letter_events (
    id uuid primary key,
    service_name varchar(100) not null,
    original_topic varchar(255) not null,
    dlt_topic varchar(255) not null,
    message_key varchar(255),
    payload text not null,
    exception_class varchar(255),
    exception_message text,
    created_at timestamptz not null default now(),
    replayed_at timestamptz
);

create index if not exists idx_dead_letter_events_service_created
    on dead_letter_events(service_name, created_at desc);
