-- OTO CUAN: initial schema
-- Every user-owned table is protected by Row Level Security (user_id = auth.uid()).
-- Money is stored in whole Rupiah (bigint). All figures are user-entered estimates.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type tx_type as enum ('in', 'out', 'goal');
create type goal_kind as enum ('down_payment', 'emergency');
create type vehicle_type as enum ('motor', 'mobil');
create type consent_type as enum ('terms', 'marketing', 'share_summary');
create type consult_channel as enum ('cabang', 'chat', 'telepon');
create type consult_status as enum ('submitted', 'contacted', 'closed');
create type reminder_kind as enum ('deposit', 'budget_review', 'data_update');

-- ---------- Reference data ----------
create table expense_categories (
  code        text primary key,
  label       text not null,
  color       text not null,
  is_essential boolean not null default false,
  sort_order  smallint not null default 0
);

create table rewards (
  code            text primary key,
  title           text not null,
  latte_required  int  not null check (latte_required > 0),
  description     text
);

create table calc_parameters (
  id             bigserial primary key,
  key            text not null,
  value          numeric not null,
  effective_from date not null default current_date,
  version        text not null,
  note           text,
  unique (key, version)
);

create table education_articles (
  slug       text primary key,
  title      text not null,
  minutes    smallint not null,
  body       jsonb not null,           -- array of paragraphs
  cta_label  text,
  cta_target text,
  published  boolean not null default true
);

-- ---------- User data ----------
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  phone       text,
  email       text,
  delete_requested_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table consents (
  id          bigserial primary key,
  user_id     uuid not null references profiles (id) on delete cascade,
  type        consent_type not null,
  granted     boolean not null,
  version     text not null default '1.0',
  granted_at  timestamptz not null default now(),
  unique (user_id, type)
);

create table finance_profiles (
  user_id            uuid primary key references profiles (id) on delete cascade,
  net_income         bigint not null default 0 check (net_income >= 0),
  essential_expense  bigint not null default 0 check (essential_expense >= 0),
  obligations        bigint not null default 0 check (obligations >= 0),
  payday_day         smallint not null default 1 check (payday_day between 1 and 31),
  updated_at         timestamptz not null default now()
);

create table category_budgets (
  user_id        uuid not null references profiles (id) on delete cascade,
  category_code  text not null references expense_categories (code),
  monthly_amount bigint not null default 0 check (monthly_amount >= 0),
  primary key (user_id, category_code)
);

create table goals (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references profiles (id) on delete cascade,
  kind                  goal_kind not null,
  vehicle               vehicle_type,
  vehicle_price         bigint check (vehicle_price > 0),
  dp_percent            smallint check (dp_percent between 5 and 90),
  months_cover          smallint check (months_cover between 1 and 24),   -- emergency fund
  monthly_contribution  bigint not null default 0 check (monthly_contribution >= 0),
  saved_amount          bigint not null default 0 check (saved_amount >= 0),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, kind)
);

create table transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles (id) on delete cascade,
  type           tx_type not null,
  category_code  text references expense_categories (code),
  goal_id        uuid references goals (id) on delete set null,
  amount         bigint not null check (amount > 0),
  note           text check (char_length(note) <= 140),
  via_nabung_yuk boolean not null default false,
  occurred_on    date not null default current_date,
  created_at     timestamptz not null default now(),
  check ((type = 'out' and category_code is not null) or type <> 'out'),
  check ((type = 'goal' and goal_id is not null) or type <> 'goal')
);
create index transactions_user_date on transactions (user_id, occurred_on desc);

create table gamification_state (
  user_id            uuid primary key references profiles (id) on delete cascade,
  latte_total        int  not null default 0,
  current_streak     int  not null default 0,
  longest_streak     int  not null default 0,
  last_saving_date   date,
  updated_at         timestamptz not null default now()
);

create table user_rewards (
  user_id      uuid not null references profiles (id) on delete cascade,
  reward_code  text not null references rewards (code),
  unlocked_at  timestamptz not null default now(),
  redeemed_at  timestamptz,
  primary key (user_id, reward_code)
);

create table repayment_scenarios (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references profiles (id) on delete cascade,
  vehicle_price    bigint not null,
  dp_percent       smallint not null,
  tenor_months     smallint not null check (tenor_months in (12, 24, 36, 48, 60)),
  flat_rate        numeric(5,4) not null,
  params_version   text not null,
  monthly_payment  bigint not null,
  total_payment    bigint not null,
  cash_left        bigint not null,
  stress_test      boolean not null default false,
  created_at       timestamptz not null default now()
);

create table readiness_snapshots (
  id             bigserial primary key,
  user_id        uuid not null references profiles (id) on delete cascade,
  indicators     jsonb not null,
  ready_count    smallint not null,
  rules_version  text not null,
  computed_at    timestamptz not null default now()
);

create table consultation_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles (id) on delete cascade,
  channel         consult_channel not null,
  slot            text,
  share_summary   boolean not null default false,
  summary         jsonb,             -- only filled when share_summary = true
  reference_code  text not null unique,
  status          consult_status not null default 'submitted',
  created_at      timestamptz not null default now()
);

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text not null,
  deep_link   text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user on notifications (user_id, created_at desc);

create table reminder_settings (
  user_id   uuid not null references profiles (id) on delete cascade,
  kind      reminder_kind not null,
  enabled   boolean not null default true,
  schedule  text not null,
  primary key (user_id, kind)
);

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  foreach t in array array['consents','finance_profiles','category_budgets','goals','transactions',
    'gamification_state','user_rewards','repayment_scenarios','readiness_snapshots',
    'consultation_requests','notifications','reminder_settings']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

alter table profiles enable row level security;
create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());

alter table expense_categories enable row level security;
alter table rewards enable row level security;
alter table calc_parameters enable row level security;
alter table education_articles enable row level security;
create policy "read reference" on expense_categories for select using (true);
create policy "read reference" on rewards for select using (true);
create policy "read reference" on calc_parameters for select using (true);
create policy "read reference" on education_articles for select using (published);

-- ---------- New user bootstrap ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, phone, email, full_name)
  values (new.id, new.phone, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into finance_profiles (user_id) values (new.id);
  insert into gamification_state (user_id) values (new.id);
  insert into reminder_settings (user_id, kind, enabled, schedule) values
    (new.id, 'deposit', true, 'Setiap tanggal 1, pukul 19.00'),
    (new.id, 'budget_review', true, 'Setiap Minggu malam'),
    (new.id, 'data_update', false, 'Setelah gajian');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
