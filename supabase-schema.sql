-- Execute no editor SQL do Supabase
-- https://app.supabase.com → SQL Editor

create table depositos (
  id           uuid primary key default gen_random_uuid(),
  discord_id   text        not null,
  nome_usuario text        not null,
  quantidade   integer     not null check (quantidade > 0),
  print_url    text        not null,
  status       text        not null default 'pendente'
                           check (status in ('pendente', 'aprovado', 'recusado')),
  aprovado_por text,
  aprovado_em  timestamptz,
  created_at   timestamptz not null default now()
);

-- Index para consultas por usuário e por status
create index idx_depositos_discord_id on depositos (discord_id);
create index idx_depositos_status     on depositos (status);

-- Desabilita RLS (o bot usa service_role_key, acesso total)
alter table depositos disable row level security;

-- Tabela de membros e controle de ciclo semanal
create table membros (
  discord_id        text        primary key,
  nome_usuario      text        not null,
  ciclo_iniciado_em timestamptz not null default now()
);

alter table membros disable row level security;
