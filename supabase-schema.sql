-- Tabla de usuarios
create table users (
  uid text primary key,
  display_name text not null,
  total_points integer default 0,
  created_at timestamptz default now()
);

-- Tabla de partidos
create table matches (
  id text primary key,
  home_team text not null,
  away_team text not null,
  home_flag text,
  away_flag text,
  stage text not null,
  group_name text,
  match_number integer,
  datetime text,
  venue text,
  home_score integer,
  away_score integer,
  finished boolean default false
);

-- Tabla de pronósticos
create table predictions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  match_id text not null,
  home_score integer not null,
  away_score integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, match_id)
);

-- Deshabilitar RLS (app privada de amigos)
alter table users disable row level security;
alter table matches disable row level security;
alter table predictions disable row level security;
