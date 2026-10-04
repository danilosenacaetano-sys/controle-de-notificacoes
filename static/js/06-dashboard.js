/*
 * 06-dashboard.js
 * Tela Dashboard: cartões por prazo, aviso e mês, e a lista de cada cartão.
 */

/* Números de um período (mês "AAAA-MM", ano "AAAA" ou tudo ""), sempre contando NOTIFICAÇÕES (ocorrências), nunca avisos:
   - abertas / avisos / vencidas = situação no fim do período (ou hoje, se o período ainda não terminou)
   - baixas  = notificações que tiveram baixa dentro do período
   - entrada = notificações que começaram no período */
function periodoDash(ocs, mes) {
    const h = hoje();
    const baixaEm = g => g.atual.baixada ? (g.atual.data_baixa || h) : null;
    let total, ref = h, ini = null;
    if (!mes) {
        total = ocs;
    }
    else {
        const ehAno = mes.length === 4, [y, m] = ehAno ? [+mes, 12] : mes.split('-').map(Number);
        ini = ehAno ? `${mes}-01-01` : mes + '-01';
        const fimMes = isoLocal(new Date(y, m, 0)), fimAnt = ehAno ? `${y - 1}-12-31` : isoLocal(new Date(y, m - 1, 0));
        ref = fimMes < h ? fimMes : h;
        total = ocs.filter(g => g.inicio <= fimMes && (g.inicio >= ini || !(baixaEm(g) && baixaEm(g) <= fimAnt)));
    }
    const avisoEm = g => {
        const vs = g.itens.filter(n => (n.data_encaminhamento || '') <= ref);
        return vs.length ? vs[vs.length - 1] : g.itens[0];
    };
    const abertas = total.filter(g => !(baixaEm(g) && baixaEm(g) <= ref));
    const etapa = k => abertas.filter(g => avisoEm(g).etapa === k);
    return { total, abertas, ref, avisoEm,
        aviso1: etapa('1'), aviso2: etapa('2'), aviso3: abertas.filter(g => numAviso(avisoEm(g).etapa) >= 3), emMulta: abertas.filter(g => ehMulta(avisoEm(g).etapa)),
        vencendoHoje: ref === h ? abertas.filter(g => avisoEm(g).data_vencimento === h) : [],
        vencidas: abertas.filter(g => avisoEm(g).data_vencimento < ref),
        noPrazo: abertas.filter(g => !(avisoEm(g).data_vencimento < ref)),
        lojasVenc: [...new Set(abertas.filter(g => avisoEm(g).data_vencimento < ref).map(g => g.loja_id))],
        baixas: ocs.filter(g => baixaEm(g) && (!mes || baixaEm(g).startsWith(mes))),
        entrada: mes ? ocs.filter(g => (g.inicio || '').startsWith(mes)) : ocs,
        multas: total.filter(g => g.itens.some(n => ehMulta(n.etapa) && (n.data_encaminhamento || '') <= ref)),
        lojas: [...new Set(abertas.map(g => g.loja_id))] };
}

/* Cartões do Dashboard em 3 blocos (cada bloco divide o total de um jeito só, sem repetir) */
const KPIS = [
    ['abertas', 'Total pendente', 'pend'], ['noPrazo', 'No prazo', 'ok'], ['vencidas', 'Vencidas', 'bad'],
    ['aviso1', '1º aviso', 'av'], ['aviso2', '2º aviso', 'av'], ['aviso3', '3º aviso ou mais', 'av'], ['emMulta', 'Em multa', 'bad'],
    ['entrada', 'Lojas entradas', 'ent'], ['baixas', 'Baixas do mês', 'bx']
];

const KPI_GRUPOS = [['Prazo', 'notificações sem baixa, pelo prazo', ['abertas', 'noPrazo', 'vencidas']],
    ['Aviso', 'pendentes, pelo aviso atual', ['aviso1', 'aviso2', 'aviso3', 'emMulta']],
    ['Mês', 'o que entrou e o que saiu', ['entrada', 'baixas']]];

const COR_KPI = { pend: '#141414', ok: '#1f8a4c', bad: '#c8102e', av: '#3d3d3d', ent: '#2f6fb3', bx: '#8a8a8a' };

/* vencimento do aviso "daquele momento" (usado para ordenar da data mais próxima para a mais distante) */
function vencOc(g, P) {
    return (P ? P.avisoEm(g) : g.atual).data_vencimento || '';
}

function ordemVenc(P) {
    return (a, b) => (a.aberta === b.aberta ? 0 : a.aberta ? -1 : 1) || vencOc(a, P).localeCompare(vencOc(b, P)) || ordemHist(a.atual, b.atual);
}

function viewDashboard() {
    state.dash.mes = hoje().slice(0, 7); /* o Dashboard mostra sempre o mês atual (muda sozinho) */
    const { mes, loja } = state.dash, mesAtual = hoje().slice(0, 7);
    let base = ocorrencias().lista;
    if (loja)
        base = base.filter(g => g.loja_id === loja);
    const P = periodoDash(base, mes);
    _dashP = P;
    const freq = {};
    P.total.forEach(g => {
        freq[g.nome] = (freq[g.nome] || 0) + 1;
    });
    const top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const lSel = loja && store.lojas.find(l => l.id === loja);
    if (state.dash.kpi && !KPIS.some(x => x[0] === state.dash.kpi))
        state.dash.kpi = '';
    const rot = k => {
        const t = KPIS.find(x => x[0] === k)[1];
        return !mes && k === 'baixas' ? 'Baixas (todas)' : mes.length === 4 && k === 'baixas' ? 'Baixas do ano' : !mes && k === 'entrada' ? 'Lojas entradas (todas)' : t;
    };
    return `${lSel ? `<div class="filtro-ativo"><span>🔎 Filtro ativo: <b>Loja ${esc(lSel.numero)} — ${esc(lSel.nome)}</b></span><button class="btn btn-sair-filtro" data-act="dashLoja" data-id="">✕ SAIR DO FILTRO</button></div>` : ''}
  ${lSel ? dashFichaLoja(lSel, P) : ''}
  <div class="dk-grupos">${KPI_GRUPOS.map(([t, sub, ks]) => `<div class="dk-grupo"><div class="dk-tit">${t} <small>${sub}</small></div>
    <div class="dk-linha" style="--n:${ks.length}">${ks.map(k => {
        const c = KPIS.find(x => x[0] === k)[2];
        return `<button type="button" class="dk ${c} ${state.dash.kpi === k ? 'sel' : ''}" data-act="dashKpi" data-id="${k}" title="${state.dash.kpi === k ? 'Fechar a lista' : 'Ver a lista'}"><span class="dk-nome">${k === 'resumo' ? '📊 Resumo do ano' : rot(k)}</span><b class="dk-num">${k === 'resumo' ? (mes || hoje()).slice(0, 4) : P[k].length}</b></button>`;
    }).join('')}</div></div>`).join('')}
  </div>
  ${state.dash.kpi ? dashListaKpi(P, mes, rot(state.dash.kpi)) : ''}
  ${state.dash.kpi || lSel ? '' : dashConsultaHTML()}
`;
}

function linhaOc(g, P) {
    const n = P ? P.avisoEm(g) : g.atual, s = situacao(g.atual), l = lojaDe(n);
    return `<tr data-act="det" data-id="${n.id}" title="Ver a notificação em tela grande"><td>${esc(l.numero)} — ${esc(l.nome)}</td><td>${esc(g.nome)}</td><td>${etapaPill(n)}</td><td><b>${esc(n.numero_notificacao)}</b></td><td>${fmtDate(g.inicio)}</td><td>${fmtDate(n.data_vencimento)}</td><td>${g.atual.baixada ? fmtDate(g.atual.data_baixa) : '—'}</td><td><span class="pill ${s.cls}">${s.label}</span></td><td>${n.tem_pdf ? `<button class="link" data-act="pdf" data-id="${n.id}">PDF${qtPdf(n)} ↗</button>` : '—'}</td></tr>`;
}

const CAB_OC = '<tr><th>Loja</th><th>Ocorrência</th><th>Aviso</th><th>Nº do aviso</th><th>Início</th><th>Vencimento</th><th>Data da baixa</th><th>Situação</th><th>PDF</th></tr>';

/* Lista de cada indicador do Dashboard, com pesquisa e filtros que respeitam a categoria escolhida */
function dashListaKpi(P, mes, titulo) {
    const k = state.dash.kpi, D = state.dash;
    if (!P[k])
        return '';
    const c = (KPIS.find(x => x[0] === k) || [, , ''])[2], total = P[k].length, ver = D.kVer === 'lojas' ? 'lojas' : 'notif';
    return `<div class="card kpi-lista"><div class="row"><h2 style="margin:0"><span class="dk-bola" style="background:${COR_KPI[c] || '#141414'}"></span>${esc(titulo)}${mes ? ` — ${nomeMes(mes)}` : ''} · ${plural(total, 'notificação', 'notificações')}</h2><button class="btn small secondary" data-act="dashKpi" data-id="${k}">Fechar lista</button></div>
    <div class="kver"><button class="chip ${ver === 'notif' ? 'active' : ''}" data-act="dashKVer" data-id="notif">Ver notificações</button><button class="chip ${ver === 'lojas' ? 'active' : ''}" data-act="dashKVer" data-id="lojas">Ver lojas</button></div>
    <div class="filtros-linha" style="margin-top:10px">
      <div class="busca-loja"><span>🔎</span><input id="kBusca" placeholder="Pesquisar loja por nome/box" value="${esc(D.kq || '')}" autocomplete="off"></div>
      ${ordSel('kOrd', D.kOrd)}
    </div>
    <div id="kpiRes">${dashKpiRes()}</div></div>`;
}

function dashKpiRes() {
    const P = _dashP, D = state.dash, k = D.kpi;
    if (!P || !P[k])
        return '';
    const q = (D.kq || '').trim().toLowerCase(), tit = (KPIS.find(x => x[0] === k) || [, ''])[1];
    const O = D.kOrd || 'venc';
    const lista = ordenar(P[k].filter(g => !q || lojaCasa(lojaDe(g.atual), q)), O, { nome: g => lojaDe(g.atual).nome, num: g => lojaDe(g.atual).numero, venc: g => vencOc(g, P), tema: g => ocKey(g.nome), seq: seqOc });
    if (!lista.length)
        return '<div class="empty">Nada nesta lista.</div>';
    if (D.kVer === 'lojas') {
        /* as lojas desta categoria: ordem alfabética, depois número da loja */
        const m = new Map();
        lista.forEach(g => {
            if (!m.has(g.loja_id))
                m.set(g.loja_id, []);
            m.get(g.loja_id).push(g);
        });
        const pend = g => P.abertas.includes(g), venc = g => pend(g) && vencOc(g, P) < P.ref;
        const ls = ordenar([...m.entries()].map(([id, gs]) => ({ id, l: store.lojas.find(x => x.id === id) || lojaDe(gs[0].atual), gs })), O, { nome: x => x.l.nome, num: x => x.l.numero, venc: x => x.gs.filter(pend).map(g => vencOc(g, P)).sort()[0] || '' });
        return `<div class="scrollx" style="margin-top:10px"><table><thead><tr><th>Loja</th><th>Nº da loja</th><th>Notificações</th><th>Infrações</th><th>Situação</th><th>Próximo vencimento</th></tr></thead><tbody>${ls.map(x => {
            const v = x.gs.filter(venc).length, pz = x.gs.filter(g => pend(g) && !venc(g)).length, bx = x.gs.length - v - pz, prox = x.gs.filter(pend).map(g => vencOc(g, P)).sort()[0] || '';
            return `<tr ${store.lojas.some(l => l.id === x.id) ? `data-act="abrirLoja" data-id="${x.id}" title="Abrir a loja na Manutenção"` : ''}><td><b>${esc(x.l.nome)}</b></td><td>${esc(x.l.numero)}</td><td><b>${x.gs.length}</b></td><td style="white-space:normal">${tagsInfracao(x.gs, P)}</td><td>${v ? `<span class="pill bad">${v} vencida${v > 1 ? 's' : ''}</span> ` : ''}${pz ? `<span class="pill ok">${pz} no prazo</span> ` : ''}${bx ? `<span class="pill neutral">${bx} com baixa</span>` : ''}</td><td>${prox ? fmtDate(prox) : '—'}</td></tr>`;
        }).join('')}</tbody></table></div>${totalRodape(`${tit} — lojas`, ls.length)}<p class="sub">Clique numa loja para abrir na Manutenção.</p>`;
    }
    return `<div class="scrollx" style="margin-top:10px"><table><thead>${CAB_OC.replace('<th>Vencimento</th>', '<th>Vencimento ▲</th>')}</thead><tbody>${lista.map(g => linhaOc(g, P)).join('')}</tbody></table></div>${totalRodape(tit, lista.length)}<p class="sub">Clique numa linha para ver a notificação em tela grande, com todos os avisos e PDFs.</p>`;
}
