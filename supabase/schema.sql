create extension if not exists pgcrypto;

create table if not exists public.meetings (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    transcript text not null default '',
    summary text not null default '',
    key_points jsonb not null default '[]'::jsonb,
    decisions jsonb not null default '[]'::jsonb,
    action_items jsonb not null default '[]'::jsonb,
    language text,
    duration_seconds integer,
    created_at timestamptz not null default now()
);

create index if not exists meetings_created_at_idx
on public.meetings (created_at desc);