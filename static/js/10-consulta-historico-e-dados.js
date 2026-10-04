/*
 * 10-consulta-historico-e-dados.js
 * Consulta do Dashboard, Histórico, janela da notificação e tela Dados / Backup.
 */

/* ---- Consulta com pesquisa e filtros (notificações ou lojas), sempre em ordem de vencimento ---- */
let _dashP = null;

function dashConsultaHTML() {
    const D = state.dash;
    return `<div class="card"><div class="row"><h2 style="margin:0">Consultar notificações e lojas</h2>
      <div class="chips" style="margin:0"><button class="chip ${D.consVer !== 'lojas' ? 'active' : ''}" data-act="dashConsVer" data-id="notif">Ver notificações</button><button class="chip ${D.consVer === 'lojas' ? 'active' : ''}" data-act="dashConsVer" data-id="lojas">Ver lojas</button></div></div>
    <div class="filtros-linha" style="margin-top:10px">
      <div class="busca-loja"><span>🔎</span><input id="dConsulta" placeholder="Pesquisar loja por nome/box" value="${esc(D.consBusca || '')}" autocomplete="off"></div>
      ${ordSel('consOrd', D.consOrd)}
    </div>
    <div id="dConsRes">${dashConsultaRes()}</div></div>`;
}

function dashConsultaRes() {
    const D = state.dash, P = _dashP;
    if (!P)
        return '';
    const q = (D.consBusca || '').trim().toLowerCase();
    const venc = g => g.aberta && vencOc(g, P) < P.ref, aberta = g => P.abertas.includes(g);
    const base = P.total.filter(g => !q || lojaCasa(lojaDe(g.atual), q));
    if (!['abertas', 'vencidas', 'prazo', 'todas'].includes(D.cons))
        D.cons = 'abertas';
    if (D.consVer === 'lojas') {
        const porLoja = new Map();
        base.forEach(g => {
            if (!porLoja.has(g.loja_id))
                porLoja.set(g.loja_id, []);
            porLoja.get(g.loja_id).push(g);
        });
        const itens = [...porLoja.entries()].map(([id, gs]) => {
            const ab = gs.filter(aberta), v = ab.filter(venc).length;
            return { id, gs, l: store.lojas.find(x => x.id === id) || lojaDe(gs[0].atual), tot: gs.length, ab: ab.length, v, p: ab.length - v, prox: ab.map(g => vencOc(g, P)).sort()[0] || '' };
        });
        const f = { abertas: x => x.ab > 0, vencidas: x => x.v > 0, prazo: x => x.ab > 0 && x.v === 0, todas: () => true };
        const cont = Object.fromEntries(Object.keys(f).map(k => [k, itens.filter(f[k]).length]));
        const ls = ordenar(itens.filter(f[D.cons]), D.consOrd || 'venc', { nome: x => x.l.nome, num: x => x.l.numero, venc: x => x.prox });
        const chips = `<div class="mostrar-ord" style="justify-content:flex-start;margin-top:10px"><label class="ord-sel">Mostrar <select id="consMostrar">${[['todas', '📋 Todas as lojas'], ['abertas', '🏬 Com notificações em aberto'], ['vencidas', '🔴 Com vencidas'], ['prazo', '🟢 No prazo']].map(([k, t]) => `<option value="${k}" ${D.cons === k ? 'selected' : ''}>${t} (${cont[k]})</option>`).join('')}</select></label></div>`;
        return chips + (ls.length ? `<div class="scrollx"><table><thead><tr><th>Loja</th><th>Notificações</th><th>Infrações</th><th>Em aberto</th><th>No prazo</th><th>Vencidas</th><th>Próximo vencimento</th></tr></thead><tbody>${ls.map(x => `<tr ${store.lojas.some(l => l.id === x.id) ? `data-act="abrirLoja" data-id="${x.id}" title="Abrir a loja na Manutenção"` : ''}><td><b>${esc(x.l.nome)}</b> — Loja ${esc(x.l.numero)}</td><td>${x.tot}</td><td style="white-space:normal">${tagsInfracao(x.gs, P)}</td><td><b>${x.ab}</b></td><td>${x.p}</td><td>${x.v ? `<span class="pill bad">${x.v}</span>` : '0'}</td><td>${fmtDate(x.prox)}</td></tr>`).join('')}</tbody></table></div>${totalRodape(({ abertas: 'Lojas com notificações em aberto', vencidas: 'Lojas com vencidas', prazo: 'Lojas no prazo', todas: 'Todas as lojas' })[D.cons], ls.length)}<p class="sub">“Lojas no prazo” = lojas com notificações em aberto e nenhuma vencida. Ordem: próximo vencimento primeiro.</p>` : '<div class="empty">Nenhuma loja encontrada neste filtro.</div>');
    }
    const f = { abertas: aberta, vencidas: g => aberta(g) && vencOc(g, P) < P.ref, prazo: g => aberta(g) && !(vencOc(g, P) < P.ref), todas: () => true };
    const cont = Object.fromEntries(Object.keys(f).map(k => [k, base.filter(f[k]).length]));
    const lista = ordenar(base.filter(f[D.cons]), D.consOrd || 'venc', { nome: g => lojaDe(g.atual).nome, num: g => lojaDe(g.atual).numero, venc: g => vencOc(g, P), tema: g => ocKey(g.nome), seq: seqOc });
    const chips = `<div class="mostrar-ord" style="justify-content:flex-start;margin-top:10px"><label class="ord-sel">Mostrar <select id="consMostrar">${[['todas', '📋 Todas'], ['abertas', '📋 Em aberto'], ['vencidas', '🔴 Vencidas'], ['prazo', '🟢 No prazo']].map(([k, t]) => `<option value="${k}" ${D.cons === k ? 'selected' : ''}>${t} (${cont[k]})</option>`).join('')}</select></label></div>`;
    return chips + (lista.length ? `<div class="scrollx"><table><thead>${CAB_OC.replace('<th>Vencimento</th>', '<th>Vencimento ▲</th>')}</thead><tbody>${lista.map(g => linhaOc(g, P)).join('')}</tbody></table></div>${totalRodape(({ abertas: 'Em aberto', vencidas: 'Vencidas', prazo: 'No prazo', todas: 'Todas' })[D.cons], lista.length)}<p class="sub">Em ordem de vencimento (da data mais próxima para a mais distante). Clique numa linha para ver a notificação em tela grande.</p>` : '<div class="empty">Nenhuma notificação encontrada neste filtro.</div>');
}

function nomeMes(mes) {
    if (/^\d{4}$/.test(mes || ''))
        return `Ano ${mes}`;
    const [y, m] = mes.split('-').map(Number);
    const t = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function dashResultadosHTML() {
    const q = (state.dash.busca || '').trim().toLowerCase();
    const sel = state.dash.loja && store.lojas.find(l => l.id === state.dash.loja);
    if (!q)
        return sel ? `<button class="chip active" data-act="dashLoja" data-id="">${esc(sel.numero)} — ${esc(sel.nome)} ✕</button>` : '';
    const ls = lojasAlfa().filter(l => lojaCasa(l, q)).slice(0, 12);
    if (!ls.length)
        return '<span class="sub">Nenhuma loja encontrada.</span>';
    return ls.map(l => `<button class="chip ${l.id === state.dash.loja ? 'active' : ''}" data-act="dashLoja" data-id="${l.id}">${esc(l.numero)} — ${esc(l.nome)}</button>`).join('');
}

function dashFichaLoja(l, P) {
    const f = P.total;
    return `<div class="card resumo-loja"><div class="row"><h2 style="margin:0">Loja ${esc(l.numero)} — ${esc(l.nome)}</h2>
    <div class="acoes" style="margin:0"><button class="btn small" data-act="abrirLoja" data-id="${l.id}">Abrir na Manutenção →</button><button class="btn btn-sair-filtro" data-act="dashLoja" data-id="">✕ SAIR DO FILTRO</button></div></div>
    <p class="sub">${plural(f.length, 'notificação', 'notificações')} · ${P.abertas.length} em aberto · ${P.vencidas.length} vencida(s) · ${P.multas.length} com multa</p>
    ${f.length ? `<div class="scrollx"><table><thead>${CAB_OC}</thead><tbody>${[...f].sort(ordemVenc(P)).map(g => linhaOc(g, P)).join('')}</tbody></table></div>${totalRodape('Notificações da loja', f.length)}` : '<div class="empty">Nenhuma notificação para esta loja no filtro.</div>'}
  </div>`;
}

/* ---------- HISTÓRICO (consulta de todas as notificações e avisos, inclusive antigos e encerrados) ---------- */
function viewHistorico() {
    const H = state.hist;
    const lSel = H.loja && store.lojas.find(l => l.id === H.loja);
    if (H.loja && !lSel)
        H.loja = '';
    const anos = [...new Set(store.notificacoes.map(anoNotif).filter(Boolean))].sort().reverse();
    const temas = [...new Set(store.notificacoes.map(n => (n.infracao || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return `<div class="card"><h2>Histórico de Notificações</h2>
    <div class="grid2"><div><label>Nome da loja</label><input id="hNome" value="${esc(H.nome)}" placeholder="Digite o nome — ex: CASA DA PICANHA" autocomplete="off"></div>
    <div><label>Número da loja</label><input id="hNumero" value="${esc(H.numero)}" placeholder="Digite o número — ex: 0024" inputmode="numeric" autocomplete="off"></div></div>
    <div class="grid3"><div><label>Tema / ocorrência (digite ou selecione)</label><input id="hTema" value="${esc(H.tema)}" placeholder="ex: VAZAMENTO" list="hTemas" autocomplete="off"><datalist id="hTemas">${temas.map(t => `<option value="${esc(t)}">`).join('')}</datalist></div>
    <div><label>Ano</label><select id="hAno"><option value="">Todos os anos</option>${anos.map(a => `<option value="${a}" ${H.ano === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
    <div><label>Aviso</label><select id="hEtapa"><option value="">Todos</option>${[['1', '1º aviso'], ['2', '2º aviso'], ['3', '3º aviso'], ['4+', '4º aviso ou mais'], ['multa', 'Multas (todas)']].map(([k, v]) => `<option value="${k}" ${H.etapa === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
    <div class="row" style="margin-top:10px"><span class="sub" id="hCount"></span>${lSel ? '' : '<span class="sub">📊 Para exportar para o Excel, clique no nome de uma loja na lista.</span>'}</div>
  </div>
  ${lSel ? `<div class="card hist-loja"><div class="row"><div><div class="sub">Loja selecionada</div><h2 style="margin:2px 0 0;border:0;padding:0">${esc(lSel.nome)} — Loja ${esc(lSel.numero)}</h2><div class="sub">${plural(ocsDaLoja(lSel.id).length, 'notificação', 'notificações')} · ${plural(store.notificacoes.filter(n => n.loja_id === lSel.id).length, 'aviso registrado', 'avisos registrados')}</div></div>
    <div class="acoes" style="margin:0"><button class="btn" data-act="histLoja" data-id="">← VOLTAR</button><button class="btn" data-act="histExcel" data-id="${lSel.id}">⬇ Exportar Excel — todas as notificações da loja</button>${H.tema.trim() ? `<button class="btn" data-act="histExcelTema" data-id="${lSel.id}">⬇ Exportar Excel — somente “${esc(H.tema.trim())}”</button>` : ''}</div></div>
    ${histTemasLojaHTML(lSel)}</div>` : ''}
  <div class="card scrollx" id="histRes">${histResultados().html}</div>`;
}

/* Temas (ocorrências) da loja selecionada: escolha um para ver só as notificações daquele tema */
function temasDaLoja(id) {
    const m = new Map();
    store.notificacoes.filter(n => n.loja_id === id).forEach(n => {
        const k = ocKey(n.infracao);
        if (!m.has(k))
            m.set(k, { nome: (n.infracao || '').trim(), av: 0 });
        m.get(k).av++;
    });
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function histTemasLojaHTML(l) {
    const H = state.hist, ts = temasDaLoja(l.id), sel = ocKey(H.tema);
    if (!ts.length)
        return '';
    const todas = `<button class="chip ${!sel ? 'active' : ''}" data-act="histTema" data-id="">Todas as notificações da loja (${store.notificacoes.filter(n => n.loja_id === l.id).length})</button>`;
    return `<div class="sub" style="margin-top:12px"><b>Consultar por tema / ocorrência:</b> escolha um tema para ver somente as notificações desta loja sobre ele.</div>
    <div class="temas-loja">${todas}${ts.map((t, i) => `<button class="chip ${H.temaExato && sel === ocKey(t.nome) ? 'active' : ''}" data-act="histTema" data-id="${i}">${esc(t.nome)} (${t.av})</button>`).join('')}</div>`;
}

function temaCasa(n) {
    const H = state.hist, tema = ocKey(H.tema);
    if (!tema)
        return true;
    return H.temaExato ? ocKey(n.infracao) === tema : ocKey(n.infracao).includes(tema);
}

function nomeArqLoja(l) {
    return `${String(l.numero).replace(/[^\w-]/g, '')}-${l.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`;
}

function histFiltrar() {
    const H = state.hist, nome = H.nome.trim().toLowerCase(), num = H.numero.trim().toLowerCase(), tema = ocKey(H.tema);
    return store.notificacoes.filter(n => {
        const l = lojaDe(n);
        if (H.loja && n.loja_id !== H.loja)
            return false;
        if (nome && !l.nome.toLowerCase().includes(nome))
            return false;
        if (num) {
            const a = String(l.numero).toLowerCase(), b = num;
            if (!(a.includes(b) || (/^\d+$/.test(b) && a.replace(/^0+/, '') === b.replace(/^0+/, ''))))
                return false;
        }
        if (H.ano && anoNotif(n) !== H.ano)
            return false;
        if (tema && !temaCasa(n))
            return false;
        if (H.etapa && !(H.etapa === 'multa' ? ehMulta(n.etapa) : H.etapa === '4+' ? numAviso(n.etapa) >= 4 : n.etapa === H.etapa))
            return false;
        return true;
    }).sort(ordemHist);
}

function histResultados() {
    const res = histFiltrar().sort(ordemHistTema);
    let atual = null, temaAt = null, seq = 0, rows = '';
    res.forEach(n => {
        const s = situacao(n), l = lojaDe(n), tk = ocKey(n.infracao);
        if (n.loja_id !== atual) {
            atual = n.loja_id;
            temaAt = null;
            const qt = res.filter(x => x.loja_id === n.loja_id).length, nt = new Set(res.filter(x => x.loja_id === n.loja_id).map(x => ocKey(x.infracao))).size;
            rows += `<tr class="grupo" ${state.hist.loja ? '' : `data-act="histLoja" data-id="${n.loja_id}" title="Selecionar esta loja para exportar o Excel"`}><td colspan="11">${esc(l.nome)} — Loja ${esc(l.numero)} <span style="font-weight:400">(${plural(qt, 'registro', 'registros')} em ${plural(nt, 'tema', 'temas')})</span>${state.hist.loja ? '' : '<span class="grupo-acao">Selecionar loja · Exportar Excel ›</span>'}</td></tr>`;
        }
        if (tk !== temaAt) {
            temaAt = tk;
            seq = 0;
            const qt = res.filter(x => x.loja_id === n.loja_id && ocKey(x.infracao) === tk).length;
            const jaSel = state.hist.loja === n.loja_id && state.hist.temaExato && ocKey(state.hist.tema) === tk;
            rows += `<tr class="grupo-tema" ${jaSel || !n.loja_id ? '' : `data-act="histTemaSel" data-id="${n.loja_id}" data-tema="${esc((n.infracao || '').trim())}" title="Ver somente este tema desta loja"`}><td colspan="11"><span class="tema-tag">TEMA</span> ${esc((n.infracao || '').trim() || '(sem descrição)')} <span style="font-weight:400">· ${plural(qt, 'registro', 'registros')}</span>${jaSel || !n.loja_id ? '' : '<span class="grupo-acao">Ver só este tema ›</span>'}</td></tr>`;
        }
        seq++;
        const podeReabrir = n.baixada && !n.avulsa && ocDe(n)?.atual === n;
        rows += `<tr data-act="seq" data-id="${n.id}" title="Ver a notificação com todos os avisos"><td class="seq-tema">${seq}ª${podeReabrir ? `<br><button class="mini-reabrir" data-act="reabrir" data-id="${n.id}" title="Reabrir esta notificação">↺ Reabrir</button>` : ''}</td><td>${esc(l.numero)}</td><td>${esc(l.nome)}</td><td><b>${esc(n.numero_notificacao)}</b></td><td>${etapaPill(n)}</td><td>${esc(n.infracao)}</td><td>${fmtDate(n.data_encaminhamento)}</td><td>${diasTxt(n.prazo_dias)}</td><td>${fmtDate(n.data_vencimento)}</td><td><span class="pill ${s.cls}">${s.label}</span></td><td>${n.tem_pdf ? `<button class="link" data-act="pdf" data-id="${n.id}">PDF${qtPdf(n)} ↗</button>` : '—'}</td></tr>`;
    });
    const nOc = new Set(res.map(n => ocDe(n)?.id)).size;
    setTimeout(() => {
        const c = document.getElementById('hCount');
        if (c)
            c.textContent = `${plural(res.length, 'registro encontrado', 'registros encontrados')} em ${plural(nOc, 'notificação', 'notificações')} · agrupados por loja e por tema · clique numa linha para ver todos os avisos da notificação`;
    });
    return { res, html: `<table><thead><tr><th>Nº no tema</th><th>Nº Loja</th><th>Loja</th><th>Nº do aviso</th><th>Aviso</th><th>Infração / tema</th><th>Encaminhado</th><th>Prazo</th><th>Vencimento</th><th>Situação</th><th>PDF</th></tr></thead><tbody>${rows || '<tr><td colspan="11" class="empty">Nenhum resultado.</td></tr>'}</tbody></table>` };
}

/* ---------- JANELA GRANDE DA NOTIFICAÇÃO (todos os avisos + detalhes + PDF) ---------- */
function liberarPdfUrl() { }

function abrirDetalhe(id) {
    const n0 = notifPorId(id);
    if (!n0)
        return;
    const g = ocDe(n0), l = lojaDe(n0);
    const seq = g ? g.itens : [n0];
    const sel = n0;
    const outras = ocsDaLoja(n0.loja_id).filter(x => x !== g && ocKey(x.nome) === ocKey(g?.nome)).sort((a, b) => a.inicio.localeCompare(b.inicio));
    const st = situacao(sel);
    const passos = seq.map((n, i) => {
        const s2 = situacao(n);
        return `${i ? '<span class="det-seta">→</span>' : ''}<button type="button" class="det-passo ${n.id === sel.id ? 'atual' : ''}" data-act="det" data-id="${n.id}">
      <span class="seq-num">${String(i + 1).padStart(2, '0')}</span><span><b>Nº ${esc(n.numero_notificacao)}</b><br>${etapaPill(n)} <span class="pill ${s2.cls}">${s2.label}</span></span></button>`;
    }).join('');
    const campo = (r, v) => `<div class="det-campo"><span>${r}</span><b>${v}</b></div>`;
    modal(`<div class="det">
    <div class="det-topo"><div><div class="sub">Loja ${esc(l.numero)} · ${esc(l.nome)} · notificação iniciada em ${fmtDate(g?.inicio)}</div><h2 class="det-titulo">${esc(g?.nome || sel.infracao)} — ${esc(l.nome)} — ${esc(g?.ano || anoNotif(sel))} <span class="pill ${g?.aberta ? 'bad' : 'neutral'}" style="vertical-align:middle">${g?.aberta ? 'Em aberto' : 'Encerrada'}</span></h2></div>
      <button class="btn secondary" id="cancel">✕ Fechar</button></div>
    <div class="det-trilha">${passos}</div>
    ${outras.length ? `<p class="sub" style="margin:0 0 10px">Outras notificações desta loja com o mesmo tema: ${outras.map(o => `<button class="chip" data-act="det" data-id="${o.atual.id}">${fmtDate(o.inicio)} (${o.aberta ? 'em aberto' : 'encerrada'})</button>`).join(' ')}</p>` : ''}
    <div class="det-corpo">
      <div class="det-info">
        <div class="det-num">${ETAPAS[sel.etapa]} · Nº ${esc(sel.numero_notificacao)}</div>
        <div style="margin:6px 0 14px">${etapaPill(sel)} <span class="pill ${st.cls}" style="font-size:14px">${st.label}</span></div>
        ${campo('Loja', `${esc(l.nome)} — Loja ${esc(l.numero)}`)}
        ${campo('Infração / ocorrência', esc(sel.infracao))}
        ${campo('Encaminhado', fmtDate(sel.data_encaminhamento))}
        ${campo('Prazo', diasTxt(sel.prazo_dias))}
        ${campo('Vencimento', fmtDate(sel.data_vencimento))}
        ${campo('Data da baixa', sel.baixada ? fmtDate(sel.data_baixa) : '—')}
        ${sel.observacoes ? `<div class="det-campo"><span>Observações</span><div class="obs" style="font-size:14px">${esc(sel.observacoes)}</div></div>` : ''}
        <div class="acoes" style="margin-top:14px">
          ${sel.tem_pdf ? `<button class="btn" id="detAbrirPdf" data-act="pdfUrl" data-url="${urlPdf(sel.id, pdfsDe(sel)[0])}">📄 Abrir PDF em nova aba</button>` : ''}
          <button class="btn secondary" data-act="editNotif" data-id="${sel.id}">✏️ Editar este aviso</button>
          ${g && g.atual.baixada && !g.atual.avulsa ? `<button class="btn btn-reabrir" data-act="reabrir" data-id="${g.atual.id}">↺ Reabrir notificação</button>` : ''}
          <button class="btn secondary" data-act="seqManut" data-id="${sel.loja_id}" data-oc="${g ? g.id : ''}">Abrir na Manutenção →</button>
        </div>
      </div>
      <div class="det-pdf-col">${pdfsDe(sel).length > 1 ? `<div class="chips">${pdfsDe(sel).map((p, i) => `<button class="chip ${i ? '' : 'active'}" data-act="detPdf" data-url="${urlPdf(sel.id, p)}" title="${esc(p.nome)}">📄 PDF ${i + 1}${p.nome && p.nome !== 'PDF' ? ` · ${esc(p.nome.length > 28 ? p.nome.slice(0, 26) + '…' : p.nome)}` : ''}</button>`).join('')}</div>` : ''}
      <div class="det-pdf" id="detPdf">${sel.tem_pdf ? `<iframe src="${urlPdf(sel.id, pdfsDe(sel)[0])}#view=FitH" title="PDF do aviso ${esc(sel.numero_notificacao)}"></iframe>` : '<div class="det-sempdf">📄<br>Nenhum PDF anexado a este aviso.<br><span class="sub">Para anexar, use “Editar” na Manutenção.</span></div>'}</div></div>
    </div></div>`, 'tela');
}

/* ---------- DADOS / BACKUP / REGISTRO DE ALTERAÇÕES ---------- */
function viewDados() {
    return `<div class="card"><h2>Backup do banco de dados</h2>
    <p class="sub">O servidor faz <b>backup automático</b> do banco de dados e de todos os PDFs. Você também pode baixar uma cópia completa agora.</p>
    <div id="bkInfo" class="sub">Carregando informações do backup…</div>
    <p class="sub" style="margin:6px 0 0">Versão do sistema: <b>${VERSAO_SISTEMA}</b></p>
    <div class="acoes" style="margin-top:10px"><a class="btn" href="/api/backup" download>⬇ Baixar backup completo agora (.zip)</a></div>
  </div>
  <div class="card"><h2>Registro de alterações</h2>
    <p class="sub">Quem fez o quê e quando — o sistema registra sozinho o usuário logado e o cargo dele. Os registros não podem ser apagados pelo sistema.</p>
    <div class="grid2"><div><label>Usuário</label><select id="audUser"><option value="">Todos</option></select></div>
    <div><label>Buscar no registro</label><input id="audQ" placeholder="ex: 0024, baixa, 2º aviso" autocomplete="off"></div></div>
    <div class="scrollx" style="margin-top:10px;max-height:520px;overflow-y:auto" id="audLista"><div class="empty">Carregando…</div></div>
  </div>
  <div class="card"><h2>Exportar para Excel</h2>
    <p class="sub">Gera uma planilha do Excel (.xlsx) formatada, com todos os avisos registrados e uma aba de resumo.</p>
    <button class="btn secondary" data-act="csvTudo">⬇ Exportar todas as notificações</button>
  </div>
  <div class="card"><h2>Trazer dados da versão antiga (sem servidor)</h2>
    <p class="sub">Se você usava a versão que guardava os dados no navegador: abra a versão antiga, vá em <b>Dados / Backup → Baixar backup completo</b> e envie aqui o arquivo <b>backup-notificacoes-….json</b>. Nada que já está no servidor é apagado; registros repetidos são ignorados.</p>
    <button class="btn secondary" data-act="importar">⬆ Importar arquivo da versão antiga</button>
    <input type="file" id="fileImport" accept="application/json,.json" class="hide">
  </div>
  <div class="card"><h2>Resumo</h2>
    <p>${plural(store.lojas.length, 'loja cadastrada', 'lojas cadastradas')} · ${plural(ocorrencias().lista.length, 'notificação', 'notificações')} · ${plural(store.notificacoes.length, 'aviso', 'avisos')} · ${plural(store.notificacoes.filter(n => n.tem_pdf).length, 'PDF', 'PDFs')}</p>
  </div>`;
}

let _aud = [];
const VERSAO_SISTEMA = '23';

async function carregarPainelDados() {
    try {
        const i = await api('GET', '/api/backup/info');
        const el = document.getElementById('bkInfo');
        if (el)
            el.innerHTML = `Último backup: <b>${i.ultimo ? new Date(i.ultimo.replace(' ', 'T')).toLocaleString('pt-BR') : 'ainda não realizado'}</b> · automático a cada ${i.a_cada_horas} h · ${i.quantidade} guardado(s) (mantém os ${i.manter} mais recentes)<br>
      Pasta no servidor: <code>${esc(i.pasta)}</code>${i.copia_extra ? `<br>Cópia extra: <code>${esc(i.copia_extra)}</code>` : '<br>⚠️ Recomendado: configure uma cópia extra (pendrive/HD externo/nuvem) no arquivo <code>config.ini</code> do servidor.'}`;
    }
    catch (e) {
        const el = document.getElementById('bkInfo');
        if (el)
            el.textContent = e.message;
    }
    try {
        _aud = await api('GET', '/api/auditoria?limite=500');
        const sel = document.getElementById('audUser');
        if (sel) {
            [...new Set(_aud.map(a => a.usuario))].sort().forEach(u => {
                const o = document.createElement('option');
                o.value = u;
                o.textContent = u;
                sel.appendChild(o);
            });
        }
        desenharAuditoria();
    }
    catch (e) {
        const el = document.getElementById('audLista');
        if (el)
            el.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
}

function desenharAuditoria() {
    const el = document.getElementById('audLista');
    if (!el)
        return;
    const u = document.getElementById('audUser')?.value || '', q = ocKey(document.getElementById('audQ')?.value || '');
    const lista = _aud.filter(a => (!u || a.usuario === u) && (!q || ocKey(a.descricao + ' ' + a.usuario).includes(q)));
    el.innerHTML = lista.length ? `<table><thead><tr><th>Data e hora</th><th>Usuário</th><th>Alteração</th></tr></thead><tbody>${lista.map(a => {
        const [d, h] = a.quando.split(' ');
        return `<tr><td>${fmtDate(d)} ${h.slice(0, 5)}</td><td><b>${esc(a.usuario)}</b>${a.cargo ? `<br><span class="sub">${esc(a.cargo)}</span>` : ''}</td><td style="white-space:normal">${esc(a.usuario)}${a.cargo ? ` — ${esc(a.cargo)} —` : ''} ${esc(a.descricao)}</td></tr>`;
    }).join('')}</tbody></table>` : '<div class="empty">Nenhuma alteração encontrada.</div>';
}

function baixarArquivo(conteudo, nome, tipo) {
    const url = URL.createObjectURL(conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function importarArquivo(file) {
    let data;
    try {
        data = JSON.parse(await file.text());
    }
    catch (e) {
        return toast('Este arquivo não é um backup válido.', 'bad');
    }
    if (!Array.isArray(data.lojas) || !Array.isArray(data.notificacoes))
        return toast('Este arquivo não é um backup do Controle de Notificações.', 'bad');
    if (!await confirmar(`${plural(data.lojas.length, 'loja', 'lojas')} e ${plural(data.notificacoes.length, 'aviso', 'avisos')} serão trazidos para o servidor.\nO servidor faz um backup antes. Nada que já existe será apagado.`, { titulo: 'Importar dados da versão antiga?', ok: 'Importar' }))
        return;
    toast('Importando… aguarde.');
    const r = await executar(() => api('POST', '/api/importar', data));
    if (r)
        toast(`Importado: ${r.lojas} loja(s), ${r.notificacoes} aviso(s), ${r.pdfs} PDF(s).` + (r.lojas_existentes || r.notificacoes_existentes ? ' Registros repetidos foram mantidos.' : ''));
}
