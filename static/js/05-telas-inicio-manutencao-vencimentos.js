/*
 * 05-telas-inicio-manutencao-vencimentos.js
 * Desenho das telas: Início, Manutenção e Vencimentos.
 */

/* =====================================================================
   RENDER
   ===================================================================== */
function irPara(tab) {
    if (tab === 'venc' && state.tab !== 'venc') {
        state.vencAno = '';
        state.vencMes = '';
    }
    state.pop = null;
    state.tab = tab;
    state.loja = null;
    state.oc = null;
    render();
    window.scrollTo(0, 0);
}

function renderTabs() {
    const nav = document.getElementById('tabs');
    nav.innerHTML = '';
    const home = state.tab === 'home';
    document.getElementById('hdr').classList.toggle('home-h', home);
    nav.classList.toggle('hide', home);
    TABS.forEach(([id, label]) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.className = id === state.tab ? 'active' : '';
        b.onclick = () => irPara(id);
        nav.appendChild(b);
    });
}

let ultimaTab = null;

function render() {
    if (!usuarioAtual)
        return;
    const app = document.getElementById('app');
    try {
        renderTabs();
        app.classList.toggle('home', state.tab === 'home');
        const views = { home: viewHome, manut: () => state.loja ? viewLojaDetalhe() : viewManutencao(), venc: viewVencimentos, dash: viewDashboard, graf: viewGraficos, hist: viewHistorico, dados: viewDados };
        const html = (views[state.tab] || viewHome)();
        app.innerHTML = ultimaTab !== state.tab ? `<div class="fade">${html}</div>` : html;
        ultimaTab = state.tab;
        if (state.tab === 'dados')
            carregarPainelDados();
    }
    catch (err) {
        console.error(err);
        app.classList.remove('home');
        app.innerHTML = `<div class="card"><h2>Não foi possível abrir esta tela</h2><p class="sub">Ocorreu um erro ao montar a tela. Os seus dados não foram alterados.</p>
      <pre class="obs">${esc(err && err.message || err)}</pre><button class="btn" data-act="ir" data-id="home">Voltar ao início</button></div>`;
    }
}

/* ---------- TELA INICIAL ---------- */
/* nome do usuário que entrou no sistema (vem do login) */
function primeiroNome() {
    const n = ((usuarioAtual && usuarioAtual.nome) || '').trim();
    return n ? n.split(/\s+/)[0] : 'usuário';
}

function viewHome() {
    const ab = ocsAbertas(), venc = ab.filter(g => g.vencida).length;
    const badges = {
        manut: `${plural(new Set(ab.map(g => g.loja_id)).size, 'loja', 'lojas')} em manutenção`,
        venc: venc ? `<span class="badge red">${plural(venc, 'vencida', 'vencidas')}</span>` : `${plural(ab.length, 'notificação em aberto', 'notificações em aberto')}`,
        dash: `${plural(ab.length, 'notificação em aberto', 'notificações em aberto')}`,
        hist: `${plural(ocorrencias().lista.length, 'notificação', 'notificações')} registradas`,
        graf: `${nomeMes(hoje().slice(0, 7))}`,
        dados: 'Backup automático',
    };
    return `<div class="home-band"></div>
  <div class="home-wrap">
    <div class="home-card">
      <img src="${LOGO}" alt="${esc(EMPRESA)}">
      <div class="div"></div>
      <h1>Controle de Notificações <span class="sep">·</span> <span>${esc(EMPRESA)}</span></h1>
      <p class="ola">Olá, ${esc(primeiroNome())}, seja bem-vindo!</p>
      <p class="ola-sub">Escolha um módulo</p>
    </div>
    <div class="modulos">${MODULOS.map(m => {
        const b = badges[m.id];
        return `<button type="button" class="modulo" data-act="ir" data-id="${m.id}" aria-label="Abrir ${m.titulo}"><span class="mi"><span class="ico">${m.ico}</span><b>${m.titulo}</b><span class="desc">${m.desc}</span>${b.startsWith('<') ? b : `<span class="badge">${b}</span>`}</span></button>`;
    }).join('')}</div>
    <p class="home-hint">Clique em uma opção</p>
    <p class="home-foot">${esc(EMPRESA)} · Sistema interno de controle de notificações</p>
  </div>`;
}

/* ---------- MANUTENÇÃO ---------- */
/* Mostra somente as lojas com notificações (ocorrências) em aberto, em ordem alfabética.
   Lojas sem pendências NÃO são apagadas: continuam cadastradas, com histórico e PDFs. */
function viewManutencao() {
    const emManut = store.lojas.filter(l => abertasDaLoja(l.id).length).length;
    const semAbertas = store.lojas.length - emManut;
    return `<div class="manut-topo">
      <div><h1 class="pag-titulo">Manutenção</h1><p class="pag-sub">Lojas com advertências em aberto</p></div>
      <div class="manut-acoes">
        <div class="manut-total"><span>Lojas em manutenção</span><b>${String(emManut).padStart(2, '0')}</b></div>
        <button class="btn btn-grande" data-act="addLoja">+ Adicionar Loja</button>
      </div>
    </div>
    <div class="card">
      <div class="busca-loja"><span>🔎</span><input id="qLoja" placeholder="Pesquisar loja por nome/box" value="${esc(state.qLoja)}" autocomplete="off"></div>
      <h2 style="margin-top:14px">Lojas com advertências em aberto <span class="sub" style="font-weight:400">· ordem alfabética</span></h2>
      <div id="listaLojas">${listaLojasHTML()}</div></div>
`;
}

function listaLojasHTML(semAbertas = false) {
    const q = state.qLoja.trim().toLowerCase();
    const ls = lojasAlfa().filter(l => lojaCasa(l, q)).filter(l => semAbertas ? !abertasDaLoja(l.id).length : abertasDaLoja(l.id).length);
    if (!store.lojas.length)
        return '<div class="empty">Nenhuma loja cadastrada ainda.</div>';
    /* Lojas sem notificação em aberto não aparecem na lista; só surgem ao PESQUISAR (para registrar uma nova notificação) */
    const outras = (!semAbertas && q) ? lojasAlfa().filter(l => lojaCasa(l, q) && !abertasDaLoja(l.id).length) : [];
    const extra = outras.length ? `<p class="sub" style="margin:14px 0 6px">Lojas encontradas <b>sem notificação em aberto</b> — clique para registrar uma nova notificação:</p>${listaHTML(outras)}` : '';
    if (!ls.length && !extra)
        return `<div class="empty">${semAbertas ? 'Nenhuma loja.' : (q ? 'Nenhuma loja encontrada nesta pesquisa.' : 'Nenhuma loja com advertências em aberto no momento. 🎉')}</div>`;
    return (ls.length ? listaHTML(ls) : (q ? '<div class="empty">Nenhuma loja com advertências em aberto nesta pesquisa.</div>' : '')) + extra;
}

function listaHTML(ls) {
    return ls.map(l => {
        const ab = abertasDaLoja(l.id), qt = ab.length, venc = ab.filter(g => g.vencida).length, tot = ocsDaLoja(l.id).length;
        return `<div class="loja-item ${qt ? '' : 'sem'}" data-act="abrirLoja" data-id="${l.id}">
      <div><div class="loja-nome">${esc(l.nome)} <span class="sub">— Loja ${esc(l.numero)}</span></div>
        ${qt ? '' : `<span class="sub">${plural(tot, 'notificação', 'notificações')} no histórico</span>`}</div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        ${venc ? `<span class="pill bad">${plural(venc, 'vencida', 'vencidas')}</span>` : ''}
        ${qt ? `<span class="qt-aberto"><b>${qt}</b> ${qt > 1 ? 'notificações em aberto' : 'notificação em aberto'}</span>` : '<span class="pill neutral">0 em aberto</span>'}
        <button class="lixo" data-act="delLoja" data-id="${l.id}" title="Excluir loja">🗑</button></div></div>`;
    }).join('');
}

function ocCardHTML(g) {
    const s = situacao(g.atual);
    return `<button type="button" class="oc-card ${g.aberta ? '' : 'fechada'}" data-act="ocorr" data-id="${g.id}">
    <span class="oc-nome">${esc(g.nome)}</span>
    <span class="sub">${g.aberta ? `Aviso atual: <b>${ETAPAS[g.atual.etapa]}</b> · Nº ${esc(g.atual.numero_notificacao)}` : `Encerrada em ${fmtDate(g.atual.data_baixa)}`} · ${plural(g.itens.length, 'aviso', 'avisos')}</span>
    <span class="oc-pills"><span class="pill ${s.cls}">${s.label}</span><span class="oc-seta">Ver →</span></span>
  </button>`;
}

function viewLojaDetalhe() {
    const l = store.lojas.find(x => x.id === state.loja);
    if (!l) {
        state.loja = null;
        state.oc = null;
        return viewManutencao();
    }
    const ocs = ocsDaLoja(l.id).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.inicio.localeCompare(b.inicio));
    const abertasOc = ocs.filter(g => g.aberta), encerradasOc = ocs.filter(g => !g.aberta).sort((a, b) => b.inicio.localeCompare(a.inicio));
    const sel = state.oc && ocs.find(g => g.id === state.oc);
    if (state.oc && !sel)
        state.oc = null;
    const topo = `<div class="card"><button class="btn btn-voltar" data-act="voltar">← Voltar às lojas</button>
    <div class="row" style="margin-top:10px"><h2 style="margin:0">Loja ${esc(l.numero)} — ${esc(l.nome)}</h2>
      <div class="acoes" style="margin:0"><button class="btn small secondary" data-act="editLoja" data-id="${l.id}">Editar loja</button>
      <button class="btn small danger" data-act="delLoja" data-id="${l.id}">🗑 Excluir loja</button></div></div>
    <div class="mini-kpis"><span><b>${abertasOc.length}</b> ${abertasOc.length === 1 ? 'notificação em aberto' : 'notificações em aberto'}</span><span><b>${ocs.length}</b> ${ocs.length === 1 ? 'notificação no total' : 'notificações no total'}</span><span><b>${ocs.filter(g => g.itens.some(n => ehMulta(n.etapa))).length}</b> com multa</span></div>
    <button class="btn" data-act="addNotif">+ Nova notificação (nova ocorrência)</button>
  </div>`;
    if (!sel) {
        return topo + `<div class="card"><h2>Notificações em aberto</h2>
      ${abertasOc.length ? `<p class="escolha">👉 Escolha uma notificação para ver os avisos.</p><div class="oc-grid">${abertasOc.map(ocCardHTML).join('')}</div>` : '<div class="empty">Nenhuma notificação em aberto nesta loja.</div>'}
    </div>
    ${encerradasOc.length ? `<div class="card"><h2>Notificações encerradas</h2><div class="oc-grid">${encerradasOc.map(ocCardHTML).join('')}</div></div>` : ''}`;
    }
    return topo + `<div class="card">
    <button class="link" data-act="ocVoltar">← Voltar às notificações</button>
    <h2 style="margin-top:12px">${esc(sel.nome)} <span class="pill ${sel.aberta ? 'bad' : 'neutral'}" style="vertical-align:middle">${sel.aberta ? 'Em aberto' : 'Encerrada'}</span></h2>
    <p class="sub">1 notificação · ${plural(sel.itens.length, 'aviso registrado', 'avisos registrados')} · iniciada em ${fmtDate(sel.inicio)}. Os avisos anteriores ficam guardados; em Vencimentos aparece só o aviso atual.</p>
    <div class="trilha-avisos">${sel.itens.map((n, i) => `${i ? '<span class="det-seta">→</span>' : ''}<span class="pill ${n === sel.atual ? 'bad' : 'neutral'}">${ETAPAS[n.etapa]}</span>`).join('')}</div>
    ${[...sel.itens].reverse().map(notifHTML).join('')}
  </div>`;
}

function notifHTML(n) {
    const s = situacao(n), g = ocDe(n), ehAtual = g && g.atual === n;
    return `<div class="notif ${ehAtual ? 'atual' : 'fechada'}">
    <div class="notif-top"><div>${etapaPill(n)} <b>${esc(n.infracao)}</b>${ehAtual && g.aberta ? ' <span class="pill warn">aviso atual</span>' : ''}</div><span class="pill ${s.cls}">${s.label}</span></div>
    <div class="sub" style="margin-top:4px">Nº ${esc(n.numero_notificacao)} · Encaminhado: ${fmtDate(n.data_encaminhamento)} · Prazo: ${diasTxt(n.prazo_dias)} · Vencimento: ${fmtDate(n.data_vencimento)}${n.baixada ? ` · Baixa em ${fmtDate(n.data_baixa)}` : ''}</div>
    ${n.observacoes ? `<div class="obs">${esc(n.observacoes)}</div>` : ''}
    <div class="acoes">
      <button class="btn small" data-act="det" data-id="${n.id}">🔍 Ver notificação</button>
      ${n.tem_pdf ? `<button class="btn small secondary" data-act="pdf" data-id="${n.id}">📄 PDF${qtPdf(n)}</button>` : ''}
      ${ehAtual && g.aberta ? `<button class="btn small" data-act="proxima" data-id="${n.id}">Emitir ${etapaLabel(proximaEtapa(g, 'aviso')).toLowerCase()} →</button><button class="btn small" data-act="proximaMulta" data-id="${n.id}">Emitir ${etapaLabel(proximaEtapa(g, 'multa')).toLowerCase()} →</button>` : ''}
      ${ehAtual && g.aberta ? `<button class="btn small secondary" data-act="baixar" data-id="${n.id}">Dar baixa</button>` : ''}
      ${ehAtual && g && !g.aberta && n.baixada && !n.avulsa ? `<button class="btn small btn-reabrir" data-act="reabrir" data-id="${n.id}">↺ Reabrir notificação</button>` : ''}
      <button class="btn small secondary" data-act="editNotif" data-id="${n.id}">Editar</button>
    </div></div>`;
}

/* ---------- VENCIMENTOS (somente o aviso atual de cada notificação em aberto) ---------- */
function viewVencimentos() {
    const p2 = n => String(n).padStart(2, '0');
    const { todos } = vencItens();
    const nV = todos.filter(x => x.vencida).length;
    return `<div class="card"><div class="row"><h2>Vencimentos de Notificações</h2><button class="btn btn-grande" data-act="inserirAvulsa">+ INSERIR NOTIFICAÇÃO</button></div>
    <div class="destaque-venc">
      <div class="dv-main"><span>Total de notificações em aberto</span><b>${p2(todos.length)}</b></div>
      <div class="dv-sec"><span>Vencidas</span><b>${p2(nV)}</b></div>
      <div class="dv-sec ok"><span>Dentro do prazo</span><b>${p2(todos.length - nV)}</b></div>
    </div>
    <div class="filtros-linha">
      <div class="busca-loja"><span>🔎</span><input id="vBusca" placeholder="Pesquisar loja por nome/box" value="${esc(state.vencBusca)}" autocomplete="off"></div>
    </div>
    <div class="venc-periodo">${mesPicker('venc', state.vencAno ? (state.vencMes ? `${state.vencAno}-${state.vencMes}` : state.vencAno) : '')}
      <button type="button" class="chip-todos ${!state.vencAno ? 'active' : ''}" data-act="vencTodos">Todos</button>
    </div>
    <div id="vencTabela">${vencTabelaHTML()}</div></div>`;
}

/* itens = aviso atual de cada notificação em aberto + notificações avulsas em aberto */
function vencItens() {
    const h = hoje();
    const todos = ocsAbertas().map(g => ({ g, n: g.atual, vencida: g.vencida, avulsa: false }))
        .concat((store.avulsas || []).filter(n => !n.baixada).map(n => ({ g: null, n, vencida: n.data_vencimento < h, avulsa: true })));
    const q = (state.vencBusca || '').trim().toLowerCase(), va = state.vencAno || '', vm = va ? (state.vencMes || '') : '';
    const per = x => {
        const d = x.n.data_vencimento || '';
        return (!va || d.slice(0, 4) === va) && (!vm || d.slice(5, 7) === vm);
    };
    const busca = todos.filter(x => (!q || lojaCasa(lojaDe(x.n), q)) && per(x));
    return { todos, busca };
}

function vencTabelaHTML() {
    if (!['todas', 'vencidas', 'prazo'].includes(state.venc))
        state.venc = 'todas';
    const { busca } = vencItens();
    const cont = { todas: busca.length, vencidas: busca.filter(x => x.vencida).length, prazo: busca.filter(x => !x.vencida).length };
    let ab = state.venc === 'vencidas' ? busca.filter(x => x.vencida) : state.venc === 'prazo' ? busca.filter(x => !x.vencida) : busca;
    /* ordem escolhida (só muda a apresentação): vencimento, nome ou número da loja */
    const O = state.vencOrdem || 'venc';
    ab = ordenar(ab, O, { nome: x => lojaDe(x.n).nome, num: x => lojaDe(x.n).numero, venc: x => x.n.data_vencimento || '', tema: x => ocKey(x.n.infracao), seq: x => seqAviso(x.n) });
    const mostrar = `<label class="ord-sel">Mostrar <select id="vMostrar">${[['todas', '📋 Em aberto'], ['vencidas', '🔴 Vencidos'], ['prazo', '🟢 No prazo']].map(([k, l]) => `<option value="${k}" ${state.venc === k ? 'selected' : ''}>${l} (${cont[k]})</option>`).join('')}</select></label>`;
    const rows = ab.map(({ g, n, avulsa }) => {
        const s = situacao(n), l = lojaDe(n);
        const inicio = avulsa ? `<tr class="linha-avulsa" data-act="editNotif" data-id="${n.id}" title="Editar esta notificação avulsa">` : `<tr data-act="abrirLoja" data-id="${n.loja_id}" data-oc="${g.id}" title="Abrir esta notificação na loja">`;
        const acoes = avulsa ? `<button class="btn small secondary" data-act="baixar" data-id="${n.id}">Dar baixa</button> ${n.tem_pdf ? `<button class="btn small secondary" data-act="pdf" data-id="${n.id}">PDF${qtPdf(n)}</button> ` : ''}<button class="btn small danger" data-act="delNotif" data-id="${n.id}">Excluir</button>` : '<span class="sub">Abrir →</span>';
        return `${inicio}<td>${esc(l.numero)} — ${esc(l.nome)}${avulsa ? ' <span class="pill warn">avulsa</span>' : ''}</td><td>${esc(n.numero_notificacao)}</td><td>${etapaPill(n)}</td><td>${esc(n.infracao)}</td><td>${fmtDate(n.data_encaminhamento)}</td><td>${diasTxt(n.prazo_dias)}</td><td><b>${fmtDate(n.data_vencimento)}</b></td><td><span class="pill ${s.cls}">${s.label}</span></td><td style="white-space:nowrap">${acoes}</td></tr>`;
    }).join('');
    const ords = `<label class="ord-sel">Ordenar por <select id="vOrdem">${[['venc', '📅 Data de vencimento'], ['nome', '🔤 Nome da loja (A–Z)'], ['numero', '🔢 Número da loja']].map(([k, l]) => `<option value="${k}" ${O === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
    return `<div class="linha-ordem"><div class="mostrar-ord">${mostrar}${ords}</div></div>
    ${ab.length ? `<div class="scrollx"><table><thead><tr><th>Loja${O !== 'venc' ? ' ▲' : ''}</th><th>Nº do aviso</th><th>Aviso atual</th><th>Infração</th><th>Encaminhado</th><th>Prazo</th><th>Vencimento${O === 'venc' ? ' ▲' : ''}</th><th>Situação</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table></div>${totalRodape(({ todas: 'Em aberto', vencidas: 'Vencidas', prazo: 'No prazo' })[state.venc] || 'Total', ab.length)}<p class="sub">${O === 'nome' ? 'Em ordem alfabética pelo nome da loja.' : O === 'numero' ? 'Em ordem numérica pelo número da loja.' : 'Em ordem de vencimento (da data mais próxima para a mais distante).'} Aparece somente o aviso atual de cada notificação. Clique numa linha para abrir a notificação na loja. As marcadas como <b>avulsa</b> foram inseridas aqui e aparecem só em Vencimentos.</p>` : `<div class="empty">Nenhuma notificação ${state.vencBusca.trim() ? 'encontrada nesta pesquisa' : 'neste filtro'}${state.vencAno ? ` com vencimento em ${state.vencMes ? NOMES_MES[+state.vencMes - 1] + '/' : ''}${state.vencAno}` : ''}.</div>`}`;
}
