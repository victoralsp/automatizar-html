// =================================================================
// SEED — Migra os dados de templates.mock.js para o Supabase
//
// Pré-requisitos:
//   npm install @supabase/supabase-js
//
// Uso:
//   SUPABASE_URL="https://xxx.supabase.co" \
//   SUPABASE_SERVICE_KEY="eyJ..." \
//   node supabase/seed.js
//
// Use a SERVICE ROLE KEY (não a anon key) para ignorar o RLS.
// Encontre em: Supabase → Settings → API → service_role key
// =================================================================

const { createClient } = require('@supabase/supabase-js');
const fs   = require('fs');
const path = require('path');

// ---- Validar variáveis de ambiente ----
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('\n❌  Configure as variáveis de ambiente antes de rodar:');
  console.error('    SUPABASE_URL e SUPABASE_SERVICE_KEY\n');
  process.exit(1);
}

// ---- Ler e avaliar templates.mock.js ----
const mockPath = path.join(__dirname, '..', 'templates.mock.js');

if (!fs.existsSync(mockPath)) {
  console.error('\n❌  Arquivo templates.mock.js não encontrado em:', mockPath);
  process.exit(1);
}

let clientData;
try {
  const src = fs.readFileSync(mockPath, 'utf8');
  // Executa o arquivo em um contexto isolado e retorna o clientData definido
  const fn = new Function(src + '\nreturn clientData;');
  clientData = fn();
} catch (e) {
  console.error('\n❌  Erro ao interpretar templates.mock.js:', e.message);
  process.exit(1);
}

const clientNames = Object.keys(clientData);
if (clientNames.length === 0) {
  console.warn('\n⚠️  Nenhum cliente encontrado em templates.mock.js.');
  process.exit(0);
}

// ---- Conectar ao Supabase com service key ----
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// ---- Seed ----
async function seed() {
  console.log(`\n📦  Iniciando migração de ${clientNames.length} clientes...\n`);
  let ok = 0, skip = 0, fail = 0;

  for (const name of clientNames) {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // remove acentos
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Inserir cliente
    const { data: client, error: clientErr } = await db
      .from('clients')
      .insert({ name, slug })
      .select('id')
      .single();

    if (clientErr) {
      if (clientErr.code === '23505') {
        console.log(`⚠️   "${name}" já existe — pulando.`);
        skip++;
        continue;
      }
      console.error(`❌  Erro ao inserir "${name}": ${clientErr.message}`);
      fail++;
      continue;
    }

    console.log(`✅  Cliente "${name}" inserido (id: ${client.id})`);

    // Inserir cabeçalho
    const { error: headerErr } = await db.from('templates').insert({
      client_id: client.id,
      type:      'header',
      html_code: clientData[name].header || ''
    });

    if (headerErr) {
      console.error(`    ❌  Cabeçalho: ${headerErr.message}`);
    } else {
      console.log(`    ✔   Cabeçalho inserido`);
    }

    // Inserir rodapé
    const { error: footerErr } = await db.from('templates').insert({
      client_id: client.id,
      type:      'footer',
      html_code: clientData[name].footer || ''
    });

    if (footerErr) {
      console.error(`    ❌  Rodapé: ${footerErr.message}`);
    } else {
      console.log(`    ✔   Rodapé inserido`);
    }

    ok++;
  }

  console.log('\n─────────────────────────────────────');
  console.log(`  Inseridos: ${ok}  |  Pulados: ${skip}  |  Erros: ${fail}`);
  console.log('─────────────────────────────────────\n');
  console.log('🎉  Migração concluída!\n');
}

seed().catch(err => {
  console.error('\n❌  Erro inesperado:', err.message);
  process.exit(1);
});
