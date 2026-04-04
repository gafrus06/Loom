create table if not exists notifications (
    id uuid primary key,
    user_id uuid not null,
    type varchar(120) not null,
    title varchar(255) not null,
    body text not null,
    entity_type varchar(120),
    entity_id uuid,
    metadata_json text,
    created_at timestamptz not null,
    read_at timestamptz
);

create index if not exists ix_notifications_user_created
    on notifications (user_id, created_at desc);

create index if not exists ix_notifications_user_read
    on notifications (user_id, read_at);
