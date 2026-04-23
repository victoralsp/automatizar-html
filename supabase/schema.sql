-- Tabela de clientes
create table clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  created_at timestamp with time zone default now()
);

-- Tabela de templates (cabeçalho e rodapé por cliente)
create table templates (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  type text not null check (type in ('header', 'footer')),
  html_code text not null default '',
  updated_at timestamp with time zone default now(),
  updated_by text,
  unique(client_id, type)
);

-- Tabela de backups (histórico de alterações)
create table templates_backup (
  id uuid default gen_random_uuid() primary key,
  template_id uuid references templates(id) on delete cascade,
  html_code text not null,
  saved_at timestamp with time zone default now(),
  saved_by text
);

-- Trigger para atualizar updated_at automaticamente
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger templates_updated_at
  before update on templates
  for each row execute function update_updated_at();

-- Row Level Security (RLS)
alter table clients enable row level security;
alter table templates enable row level security;
alter table templates_backup enable row level security;

-- Leitura pública (para a ferramenta principal funcionar sem login)
create policy "leitura publica clients"
  on clients for select using (true);

create policy "leitura publica templates"
  on templates for select using (true);

create policy "leitura publica backups"
  on templates_backup for select using (true);

-- Escrita apenas para usuários autenticados
create policy "escrita autenticada clients"
  on clients for all using (auth.role() = 'authenticated');

create policy "escrita autenticada templates"
  on templates for all using (auth.role() = 'authenticated');

create policy "escrita autenticada backups"
  on templates_backup for all using (auth.role() = 'authenticated');
