# Prompt para Claude Code — Sistema Admin de Templates de Email Marketing

## Contexto do projeto

Este repositório (`automatizar-html`) é uma ferramenta interna de email marketing em **HTML, CSS e JavaScript puro**, hospedada no **GitHub Pages**.

O arquivo `templates.js` contém dados mockados de clientes (cabeçalhos e rodapés em HTML). O problema: sempre que um cliente novo entra ou um cabeçalho/rodapé muda, o desenvolvedor precisa ser chamado para editar o código manualmente.

**Objetivo desta tarefa:** migrar os dados do `templates.js` para o **Supabase** e criar um **painel administrativo** para que o time de CRM (não-desenvolvedores) possa gerenciar os templates sem precisar do dev.

---

## O que NÃO mexer

- `index.html` — não alterar a estrutura, apenas ajustar o import do JS
- `style.css` e `media-query-style.css` — não alterar
- `index.js` — não alterar a lógica, apenas adaptar chamadas se necessário
- A experiência da ferramenta principal deve continuar **idêntica** para os usuários

---

## Passo 0 — Leitura obrigatória antes de codar

Antes de criar qualquer arquivo, leia:
1. O conteúdo atual de `templates.js` para entender a estrutura dos dados mockados
2. O conteúdo de `index.js` para entender como os templates são consumidos
3. O conteúdo de `index.html` para entender a estrutura atual

Use essa leitura para adaptar a migração ao formato exato que o projeto já usa.

---

## Passo 1 — Configuração do Supabase (SQL)

Crie um arquivo `supabase/schema.sql` com os comandos abaixo. O usuário vai executar isso no SQL Editor do painel do Supabase.

```sql
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
```

---

## Passo 2 — Arquivo de configuração do Supabase

Crie `supabase-config.js` na raiz do projeto:

```js
// Substitua pelos valores reais do seu projeto Supabase
// Painel Supabase → Settings → API
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';
```

> **Instrução para o usuário:** Adicione `supabase-config.js` ao `.gitignore` para não expor as chaves no GitHub.
> Crie também um `supabase-config.example.js` com os campos vazios para servir de referência.

---

## Passo 3 — Migrar `templates.js` para buscar do Supabase

Renomeie o arquivo original para `templates.mock.js` (mantém como backup dos dados).

Crie um novo `templates.js` que:
- Importa o cliente Supabase via CDN (adicionar no HTML): `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js`
- Busca todos os clientes e seus templates em uma única chamada ou join
- Retorna os dados no **mesmo formato** que o mock original exportava, para que `index.js` não precise mudar
- Mostra estado de loading enquanto busca
- Trata erros com fallback visual amigável

Adapte o formato de retorno lendo o `templates.mock.js` original.

---

## Passo 4 — Arquivos novos do painel admin

### 4a. `login.html`

Página de login simples com:
- Campo email
- Campo senha
- Botão entrar
- Mensagem de erro em caso de credenciais inválidas
- Redireciona para `admin.html` após login bem-sucedido
- Se já estiver logado, redireciona automaticamente para `admin.html`

### 4b. `admin.html`

Painel principal com:
- Header com nome do sistema e botão "Sair" (logout)
- Grade de cards, um por cliente
- Cada card mostra: nome do cliente e dois botões — **"Cabeçalho"** e **"Rodapé"**
- Ao clicar em qualquer botão, abre um modal de edição
- Modal contém:
  - Título: "Editando [Cabeçalho/Rodapé] — [Nome do Cliente]"
  - `<textarea>` grande com o HTML atual (editável)
  - Botão **"Salvar alteração"**
  - Link **"Ver histórico de versões"** que expande uma lista dos últimos 5 backups
  - Cada backup mostra: data/hora formatada em pt-BR, por quem foi salvo
  - Botão **"Restaurar esta versão"** em cada backup
  - Botão **"Fechar"** ou clique fora do modal para fechar sem salvar
- Se não estiver logado, redireciona para `login.html`

### 4c. `admin.js`

Lógica do painel:
- Verificação de sessão Supabase ao carregar
- Função `carregarClientes()` — busca todos os clientes e seus templates
- Função `abrirModal(clientId, clientName, type)` — popula e abre o modal
- Função `salvarTemplate(templateId, htmlCode)`:
  1. Busca o HTML atual do template
  2. Salva na tabela `templates_backup` (com timestamp e email do usuário logado)
  3. Atualiza a tabela `templates` com o novo HTML
  4. Mostra feedback de sucesso ou erro
- Função `carregarHistorico(templateId)` — busca os últimos 5 backups
- Função `restaurarBackup(backupId, templateId)`:
  1. Salva estado atual como backup antes de restaurar
  2. Atualiza o template com o HTML do backup selecionado
  3. Atualiza a textarea do modal com o HTML restaurado
- Função `logout()` — faz signOut no Supabase e redireciona para `login.html`

---

## Passo 5 — Atualizar `index.html`

Adicionar as duas tags `<script>` necessárias antes do fechamento do `</body>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script src="supabase-config.js"></script>
```

E ajustar o import do `templates.js` se necessário (provavelmente já existe, só verificar a ordem).

---

## Passo 6 — Script de migração dos dados mockados

Crie `supabase/seed.js` — um script Node.js simples que:
- Lê os dados do `templates.mock.js`
- Insere cada cliente na tabela `clients`
- Insere o cabeçalho e rodapé correspondentes na tabela `templates`
- Loga no console o resultado de cada inserção

Isso permite ao usuário migrar os dados existentes com um único `node supabase/seed.js` (após configurar as variáveis de ambiente).

---

## Design — Skill: frontend-design (anthropics/skills)

**Aplicar esta skill em `login.html` e `admin.html`.**

### Direção estética para este projeto

**Contexto:** Ferramenta interna de uma agência/time de CRM. Usuários são profissionais de marketing, não-devs. A interface precisa passar confiança, ser clara e agradável de usar no dia a dia — sem ser genérica.

**Tom:** Refinado e editorial. Sóbrio mas com personalidade. Como uma ferramenta profissional de alto nível, não um painel de administração genérico.

**O que deve ser MEMORÁVEL:** A tipografia. Escolha uma fonte display marcante para os títulos (ex: algo da família serif contemporânea, ou sans-serif geométrica incomum do Google Fonts) e uma fonte legível para o corpo. O painel deve parecer que foi desenhado com intenção, não gerado automaticamente.

**Regras de design:**

- Paleta: tons escuros/neutros como base (cinza carvão, off-white, preto suave) com **um único acento vibrante** (pode ser âmbar, terracota, verde-floresta — escolha com intenção e mantenha em todos os elementos interativos)
- Backgrounds com textura sutil (noise, grain ou padrão geométrico discreto) — não cor sólida pura
- Botões com hover states que surpreendem (ex: fill que avança da esquerda, ou borda que se anima)
- Cards dos clientes com sombra expressiva no hover, não no estado padrão
- Modal com entrada animada (slide + fade)
- `<textarea>` de código com fonte monospace, background ligeiramente diferente, borda com acento
- Feedback de sucesso/erro com animação de entrada discreta
- Loading state nos cards enquanto busca do Supabase

**Não usar:** Inter, Roboto, Arial, gradientes roxos, layout de 3 colunas simétricas, cards com bordas arredondadas genéricas.

---

## Estrutura final de arquivos esperada

```
automatizar-html/
├── index.html              (não alterar estrutura)
├── index.js                (não alterar lógica)
├── style.css               (não alterar)
├── media-query-style.css   (não alterar)
├── templates.js            (reescrito — busca do Supabase)
├── templates.mock.js       (renomeado — backup dos dados originais)
├── supabase-config.js      (novo — não commitar)
├── supabase-config.example.js (novo — commitar sem valores)
├── login.html              (novo)
├── admin.html              (novo)
├── admin.js                (novo)
├── .gitignore              (atualizar com supabase-config.js)
└── supabase/
    ├── schema.sql          (novo — rodar no Supabase)
    └── seed.js             (novo — migração dos dados mockados)
```

---

## Checklist de validação (verificar antes de encerrar)

- [ ] `index.html` continua funcionando sem login
- [ ] Os dados exibidos na ferramenta principal são os mesmos do mock (após seed)
- [ ] Acessar `admin.html` sem estar logado redireciona para `login.html`
- [ ] Login com credenciais inválidas exibe mensagem de erro
- [ ] Login com credenciais válidas redireciona para `admin.html`
- [ ] A lista de clientes carrega corretamente
- [ ] Clicar em "Cabeçalho" abre o modal com o HTML atual
- [ ] Clicar em "Rodapé" abre o modal com o HTML atual
- [ ] Salvar cria um backup antes de atualizar
- [ ] O histórico de versões exibe as últimas 5 entradas
- [ ] Restaurar uma versão cria backup do estado atual antes de restaurar
- [ ] Logout limpa a sessão e redireciona para `login.html`
- [ ] Nenhuma chave do Supabase está hardcodada fora de `supabase-config.js`
