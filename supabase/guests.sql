-- Run once in Supabase → SQL Editor. Shared guest list for the IV (RSVPs) and the thank-you app (gifts).
create table if not exists public.guests (
  id          uuid primary key default gen_random_uuid(),
  event_slug  text not null,                 -- e.g. 'moday27' (one couple = one slug)
  code        text not null unique,          -- the guest's personal link: /?g=<code>
  name        text not null,
  phone       text,                          -- 11 digits, e.g. 08050366355
  network     text check (network in ('mtn','airtel','glo','etisalat')),
  coming      text,                          -- 'yes' | 'no' | 'walk-in'
  seats       int,
  days        text[],
  move        text,
  wish        text,
  is_demo     boolean not null default false,
  gift_status text not null default 'none' check (gift_status in ('none','sending','delivered','failed')),
  gift_amount int,
  gift_mode   text,                          -- 'live' | 'sandbox' | 'simulated'
  gift_ref    text,                          -- VTpass request_id
  gift_error  text,
  gifted_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (event_slug, phone)                 -- one gift per number per wedding
);

create index if not exists guests_event_idx on public.guests (event_slug, created_at);

-- Phone numbers are private: lock the table. Only the two apps' servers (secret key) can read or write.
alter table public.guests enable row level security;
