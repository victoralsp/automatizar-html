// =================================================================
// TEMPLATES — dados carregados do Supabase
// O formato de retorno é idêntico ao templates.mock.js original:
// window.clientData = { "NOME CLIENTE": { header: "...", footer: "..." } }
// =================================================================

window.clientData = {};

window.clientDataReady = (async function loadClientData() {
  // Barra de progresso de carregamento
  const bar = document.createElement('div');
  bar.id = 'supabase-loading-bar';
  Object.assign(bar.style, {
    position: 'fixed', top: '0', left: '0', height: '3px',
    width: '0%', background: '#3b82f6',
    transition: 'width 0.4s ease, opacity 0.4s ease',
    zIndex: '9999', pointerEvents: 'none'
  });
  document.body.appendChild(bar);
  requestAnimationFrame(() => { bar.style.width = '65%'; });

  try {
    if (typeof supabase === 'undefined') {
      throw new Error('SDK do Supabase não carregado. Verifique a tag <script> do CDN.');
    }
    if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL || SUPABASE_URL.includes('SEU_PROJETO')) {
      throw new Error('Supabase não configurado. Preencha supabase-config.js com sua URL e chave.');
    }

    const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const [{ data: clients, error: eClients }, { data: templates, error: eTemplates }] =
      await Promise.all([
        db.from('clients').select('id, name').order('name'),
        db.from('templates').select('client_id, type, html_code')
      ]);

    if (eClients) throw eClients;
    if (eTemplates) throw eTemplates;

    // Monta clientData no formato esperado pelo index.js
    clients.forEach(c => {
      window.clientData[c.name] = { header: '', footer: '' };
    });
    templates.forEach(t => {
      const client = clients.find(c => c.id === t.client_id);
      if (client && window.clientData[client.name] !== undefined) {
        window.clientData[client.name][t.type] = t.html_code;
      }
    });

    bar.style.width = '100%';
    setTimeout(() => { bar.style.opacity = '0'; }, 200);
    setTimeout(() => bar.remove(), 650);

  } catch (err) {
    console.error('[templates.js] Erro ao carregar do Supabase:', err);

    bar.style.background = '#E85444';
    bar.style.width = '100%';
    setTimeout(() => bar.remove(), 2000);

    const banner = document.createElement('div');
    Object.assign(banner.style, {
      position: 'fixed', bottom: '24px', right: '24px',
      background: '#1C1C1C', color: '#E8E3D8',
      border: '1px solid #E85444', borderLeft: '4px solid #E85444',
      padding: '14px 20px', fontFamily: 'sans-serif', fontSize: '13px',
      lineHeight: '1.5', zIndex: '9999', maxWidth: '360px',
      boxShadow: '0 8px 32px rgba(0,0,0,.6)', borderRadius: '2px'
    });
    banner.innerHTML = `
      <strong style="display:block;margin-bottom:4px;color:#E85444">Erro ao carregar templates</strong>
      ${err.message}<br>
      <button onclick="this.parentElement.remove()"
        style="margin-top:10px;background:none;border:1px solid #555;color:#999;
               padding:4px 10px;cursor:pointer;font-size:12px">
        Fechar
      </button>`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 10000);
  }
})();
