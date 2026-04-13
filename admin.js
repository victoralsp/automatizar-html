// =================================================================
// ADMIN.JS — Painel de gerenciamento de templates
// =================================================================

let db;
let currentUser;

// Estado do modal aberto no momento
const modal = {
  clientId: null,
  clientName: null,
  type: null,
  templateId: null
};

// Cache dos backups carregados para evitar passar HTML enorme via onclick
let backupsCache = [];

// ======================================================================
// INIT
// ======================================================================
document.addEventListener('DOMContentLoaded', async () => {
  db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  currentUser = session.user;
  document.getElementById('user-email').textContent = currentUser.email;

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') window.location.href = 'login.html';
  });

  await carregarClientes();

  // Fechar modal ao clicar fora do container
  document.getElementById('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) fecharModal();
  });

  // Delegação de eventos para botões "Restaurar" no histórico
  document.getElementById('history-list').addEventListener('click', function (e) {
    const btn = e.target.closest('[data-restore-index]');
    if (btn) restaurarBackup(parseInt(btn.dataset.restoreIndex));
  });
});

// ======================================================================
// CLIENTES
// ======================================================================
async function carregarClientes() {
  const grid = document.getElementById('clients-grid');
  grid.innerHTML = `
    <div class="loading-cards">
      <div class="loading-card"></div>
      <div class="loading-card"></div>
      <div class="loading-card"></div>
      <div class="loading-card"></div>
    </div>`;

  const { data: clients, error } = await db
    .from('clients')
    .select('id, name, created_at')
    .order('name');

  if (error) {
    grid.innerHTML = `<p class="state-message state-error">Erro ao carregar clientes: ${error.message}</p>`;
    return;
  }

  if (!clients || clients.length === 0) {
    grid.innerHTML = `<p class="state-message">Nenhum cliente cadastrado. Execute o script de seed para popular os dados.</p>`;
    return;
  }

  grid.innerHTML = clients.map(client => `
    <div class="client-card">
      <div class="card-initial" aria-hidden="true">${client.name.charAt(0).toUpperCase()}</div>
      <div class="card-body">
        <h3 class="card-name">${escHtml(client.name)}</h3>
        <p class="card-date">Desde ${formatDate(client.created_at, 'date')}</p>
      </div>
      <div class="card-actions">
        <button class="btn-template" onclick="abrirModal('${client.id}', '${escAttr(client.name)}', 'header')">
          Cabeçalho
        </button>
        <button class="btn-template" onclick="abrirModal('${client.id}', '${escAttr(client.name)}', 'footer')">
          Rodapé
        </button>
      </div>
    </div>
  `).join('');
}

// ======================================================================
// MODAL
// ======================================================================
async function abrirModal(clientId, clientName, type) {
  modal.clientId = clientId;
  modal.clientName = clientName;
  modal.type = type;
  modal.templateId = null;

  backupsCache = [];

  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const textarea = document.getElementById('template-textarea');
  const historyToggle = document.getElementById('history-toggle');
  const historyList = document.getElementById('history-list');
  const feedback = document.getElementById('save-feedback');

  const typeLabel = type === 'header' ? 'Cabeçalho' : 'Rodapé';
  titleEl.textContent = `Editando ${typeLabel} — ${clientName}`;

  textarea.value = '';
  textarea.placeholder = 'Carregando...';
  textarea.disabled = true;
  historyToggle.textContent = 'Ver histórico de versões';
  historyList.style.display = 'none';
  historyList.innerHTML = '';
  feedback.style.display = 'none';

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const { data, error } = await db
    .from('templates')
    .select('id, html_code')
    .eq('client_id', clientId)
    .eq('type', type)
    .maybeSingle();

  if (error) {
    textarea.placeholder = `Erro ao carregar: ${error.message}`;
    return;
  }

  if (data) {
    modal.templateId = data.id;
    textarea.value = data.html_code;
    textarea.placeholder = '';
  } else {
    textarea.placeholder = 'Nenhum template cadastrado ainda. Digite o HTML aqui para criar.';
  }

  textarea.disabled = false;
  textarea.focus();
}

function fecharModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  modal.clientId = null;
  modal.clientName = null;
  modal.type = null;
  modal.templateId = null;
  backupsCache = [];
}

// ======================================================================
// SALVAR
// ======================================================================
async function salvarTemplate() {
  const html = document.getElementById('template-textarea').value;
  const btn = document.getElementById('save-btn');
  const feedback = document.getElementById('save-feedback');

  btn.disabled = true;
  btn.textContent = 'Salvando...';

  try {
    if (modal.templateId) {
      // 1. Buscar HTML atual para backup
      const { data: current } = await db
        .from('templates')
        .select('html_code')
        .eq('id', modal.templateId)
        .single();

      // 2. Salvar backup somente se o conteúdo mudou
      if (current && current.html_code !== html) {
        await db.from('templates_backup').insert({
          template_id: modal.templateId,
          html_code: current.html_code,
          saved_by: currentUser.email
        });
      }

      // 3. Atualizar template
      const { error } = await db
        .from('templates')
        .update({ html_code: html, updated_by: currentUser.email })
        .eq('id', modal.templateId);

      if (error) throw error;

    } else {
      // Template não existe — criar
      const { data, error } = await db
        .from('templates')
        .insert({
          client_id: modal.clientId,
          type: modal.type,
          html_code: html,
          updated_by: currentUser.email
        })
        .select('id')
        .single();

      if (error) throw error;
      modal.templateId = data.id;
    }

    mostrarFeedback(feedback, 'success', 'Salvo com sucesso!');

  } catch (err) {
    console.error('[admin.js] salvarTemplate:', err);
    mostrarFeedback(feedback, 'error', 'Erro ao salvar. Tente novamente.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar alteração';
  }
}

// ======================================================================
// HISTÓRICO
// ======================================================================
async function toggleHistorico() {
  const list = document.getElementById('history-list');
  const toggle = document.getElementById('history-toggle');

  if (list.style.display === 'block') {
    list.style.display = 'none';
    toggle.textContent = 'Ver histórico de versões';
    return;
  }

  if (!modal.templateId) {
    list.innerHTML = '<p class="history-empty">Salve o template primeiro para ver o histórico.</p>';
    list.style.display = 'block';
    toggle.textContent = 'Ocultar histórico';
    return;
  }

  toggle.textContent = 'Carregando histórico...';

  await carregarHistorico(modal.templateId);

  list.style.display = 'block';
  toggle.textContent = 'Ocultar histórico';
}

async function carregarHistorico(templateId) {
  const list = document.getElementById('history-list');

  const { data, error } = await db
    .from('templates_backup')
    .select('id, html_code, saved_at, saved_by')
    .eq('template_id', templateId)
    .order('saved_at', { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) {
    list.innerHTML = '<p class="history-empty">Nenhum histórico encontrado.</p>';
    backupsCache = [];
    return;
  }

  backupsCache = data;

  list.innerHTML = data.map((backup, i) => `
    <div class="backup-item">
      <div class="backup-meta">
        <span class="backup-date">${formatDate(backup.saved_at, 'datetime')}</span>
        ${backup.saved_by ? `<span class="backup-by">por ${escHtml(backup.saved_by)}</span>` : ''}
      </div>
      <button class="btn-restore" data-restore-index="${i}">Restaurar esta versão</button>
    </div>
  `).join('');
}

// ======================================================================
// RESTAURAR BACKUP
// ======================================================================
async function restaurarBackup(index) {
  const backup = backupsCache[index];
  if (!backup) return;

  if (!confirm('Restaurar esta versão? O estado atual será salvo como backup antes.')) return;

  const textarea = document.getElementById('template-textarea');
  const feedback = document.getElementById('save-feedback');

  try {
    // 1. Salvar estado atual como backup antes de restaurar
    const currentHtml = textarea.value;
    if (currentHtml && modal.templateId) {
      await db.from('templates_backup').insert({
        template_id: modal.templateId,
        html_code: currentHtml,
        saved_by: currentUser.email + ' (auto-backup antes de restaurar)'
      });
    }

    // 2. Atualizar o template com o HTML do backup
    const { error } = await db
      .from('templates')
      .update({ html_code: backup.html_code, updated_by: currentUser.email })
      .eq('id', modal.templateId);

    if (error) throw error;

    // 3. Atualizar a textarea
    textarea.value = backup.html_code;

    mostrarFeedback(feedback, 'success', 'Versão restaurada com sucesso!');

    // 4. Recarregar o histórico atualizado
    await carregarHistorico(modal.templateId);

  } catch (err) {
    console.error('[admin.js] restaurarBackup:', err);
    mostrarFeedback(feedback, 'error', 'Erro ao restaurar. Tente novamente.');
  }
}

// ======================================================================
// LOGOUT
// ======================================================================
async function logout() {
  await db.auth.signOut();
  window.location.href = 'login.html';
}

// ======================================================================
// HELPERS
// ======================================================================
function mostrarFeedback(el, type, message) {
  el.textContent = message;
  el.className = 'feedback ' + type;
  el.style.display = 'block';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => {
    el.style.display = 'none';
  }, 5000);
}

function formatDate(iso, mode = 'datetime') {
  const d = new Date(iso);
  if (mode === 'date') {
    return d.toLocaleDateString('pt-BR');
  }
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
