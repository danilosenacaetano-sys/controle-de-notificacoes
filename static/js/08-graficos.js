/*
 * 08-graficos.js
 * Tela Gráficos: Resumo do ano e Mês a mês (cartões, gráfico e tabela de lojas).
 */

/* ===== RESUMO DO ANO (aba Gráficos) — só lê os dados que já existem =====
   o gráfico dos 12 meses é o seletor (mês ou "Ano todo"); tudo é clicável e abre UMA tabela embaixo */
function raPeriodo() {
    const D = state.dash;
    if (!D.raAno)
        D.raAno = hoje().slice(0, 4);
    return D.raMes && D.raMes.startsWith(D.raAno) ? D.raMes : D.raAno;
}

function resumoDados() {
    const D = state.dash, per = raPeriodo(), base = ocorrencias().lista, h = hoje();
    const ocs = base.filter(g => (g.inicio || '').startsWith(per));
    const avisos = [];
    base.forEach(g => g.itens.forEach(n => {
        if ((n.data_encaminhamento || '').startsWith(per))
            avisos.push(n);
    }));
    const multas = avisos.filter(n => ehMulta(n.etapa)), baixas = base.filter(g => g.atual.baixada && (g.atual.data_baixa || '').startsWith(per));
    const P = periodoDash(base, per), pend = P.abertas;
    const conta = (arr, chave, info) => {
        const m = new Map();
        arr.forEach(x => {
            const k = chave(x);
            if (!m.has(k))
                m.set(k, { k, ...info(x), n: 0, itens: [] });
            const o = m.get(k);
            o.n++;
            o.itens.push(x);
        });
        return [...m.values()].sort((a, b) => b.n - a.n || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    };
    const lj = g => lojaDe(g.atual || g);
    return { per, P, ocs, avisos, multas, baixas, pend, aberto: saldoMes(base, per), resolvidas: ocs.filter(g => g.atual.baixada),
        meses: Array.from({ length: 12 }, (_, i) => {
            const m = `${D.raAno}-${String(i + 1).padStart(2, '0')}`;
            return { m, v: base.filter(g => (g.inicio || '').startsWith(m)).length };
        }),
        topLojas: conta(ocs, g => g.loja_id, g => ({ nome: lj(g).nome, num: lj(g).numero })),
        topTemas: conta(ocs, g => ocKey(g.nome), g => ({ nome: g.nome })),
        lojasMulta: conta(multas, n => n.loja_id, n => ({ nome: lojaDe(n).nome, num: lojaDe(n).numero })),
        reinc: conta(ocs, g => g.loja_id + '|' + ocKey(g.nome), g => ({ nome: lj(g).nome, num: lj(g).numero, tema: g.nome })).filter(x => x.n > 1) };
}

const RA_KPIS = [['entradas', 'Lojas entradas'], ['baixas', 'Baixas'], ['feitas', 'Notificações feitas'], ['multas', 'Multas'], ['aberto', 'Em aberto no fim do mês']];

function resumoAnoHTML() {
    const D = state.dash;
    if (D.raSel && D.raSel.t === 'kpi' && !RA_KPIS.some(x => x[0] === D.raSel.id))
        D.raSel = null;
    const R = resumoDados(), per = R.per, nomeP = per.length === 4 ? `Ano todo de ${per}` : nomeMes(per), anoAt = hoje().slice(0, 4);
    const mx = Math.max(1, ...R.meses.map(x => x.v)), sel = D.raSel;
    const n = { entradas: R.ocs.length, feitas: R.avisos.length, baixas: R.baixas.length, multas: R.multas.length, aberto: R.aberto.length };
    const tot = R.ocs.length, res = R.resolvidas.length, pr = tot ? Math.round(res / tot * 100) : 0;
    const lin = (t, arr, f) => arr.length ? arr.map(f).join('') : '<div class="sub">Nada neste período.</div>';
    const item = (t, x, txt, val) => `<div class="ra-lin ${sel && sel.t === t && sel.id === x.k ? 'on' : ''}" data-act="raSel" data-t="${t}" data-id="${esc(x.k)}" title="Ver as notificações">${txt}<b>${val}</b></div>`;
    return `<div class="card gr-sec">
    <div class="row" style="align-items:center"><h2 style="margin:0">📊 Resumo do ano</h2>
      ${mesPicker('raAno', D.raAno)}</div>
    <div class="gr-box" style="margin-top:12px"><div class="row" style="align-items:flex-start"><div><h3 style="margin:0">Gráfico mensal</h3><span class="sub">Clique num mês para ver só ele, ou em “Ano todo”</span></div>
      <button type="button" class="chip-todos ${per.length === 4 ? 'active' : ''}" data-act="raMes" data-id="">Ano todo</button></div>
      <div class="evo">${R.meses.map((x, i) => `<div class="col ${per === x.m ? 'ref sel' : ''}" data-act="raMes" data-id="${x.m}" title="${esc(nomeMes(x.m))}: ${x.v}"><span class="num">${x.v}</span><div class="barra" style="height:${x.v / mx * 100}%"></div></div>`).join('')}</div>
      <div class="evo-rot">${R.meses.map(x => `<span class="${per === x.m ? 'ref' : ''}">${MESES_CURTOS[+x.m.slice(5) - 1]}</span>`).join('')}</div></div>
    <h3 style="margin:16px 0 8px">${esc(nomeP)}</h3>
    <div class="cmp-grid ra-cmp">${RA_KPIS.map(([k, t]) => `<div class="cmp clic ${sel && sel.t === 'kpi' && sel.id === k ? 'sel' : ''}" data-act="raSel" data-t="kpi" data-id="${k}" title="Ver as notificações"><div class="t">${k === 'aberto' && per.length === 4 ? 'Em aberto no fim do ano' : t}</div><div class="v">${n[k]}</div></div>`).join('')}</div>
    ${sel && sel.t === 'kpi' ? resumoTabelaHTML(R) : ''}
    <div class="ra-box" style="margin-top:12px"><h4>🎯 Para zerar as notificações ${per.length === 4 ? `de ${per}` : `de ${esc(nomeMes(per).toLowerCase())}`}</h4>
      ${tot ? `<div class="ra-zerar"><span>Resolvidas <b>${res}</b> de <b>${tot}</b> (${pr}%)</span><div class="ra-barra"><i style="width:${pr}%"></i></div><span>Faltam <b>${tot - res}</b> (${100 - pr}%)</span></div>` : '<div class="sub">Nenhuma notificação entrou neste período.</div>'}</div>
    <div class="ra-duas">
      <div class="ra-box"><h4>🏆 Lojas com mais notificações</h4>${lin('loja', R.topLojas.slice(0, 5), (x, i) => item('loja', x, `<span>${i + 1}. ${esc(x.nome)} <span class="sub">· ${esc(x.num)}</span></span>`, x.n))}</div>
      <div class="ra-box"><h4>⚠ Infrações mais comuns</h4>${lin('tema', R.topTemas.slice(0, 5), (x, i) => item('tema', x, `<span>${i + 1}. ${esc(x.nome)}</span>`, x.n))}</div>
      <div class="ra-box"><h4>🔴 Lojas que receberam multa (${R.multas.length} multa${R.multas.length === 1 ? '' : 's'})</h4>${lin('multa', R.lojasMulta, x => item('multa', x, `<span>${esc(x.nome)} <span class="sub">· ${esc(x.num)}</span></span>`, x.n))}</div>
      <div class="ra-box"><h4>🔁 Lojas reincidentes (mesma infração mais de uma vez)</h4>${lin('reinc', R.reinc, x => item('reinc', x, `<span>${esc(x.nome)} <span class="sub">· ${esc(x.tema)}</span></span>`, x.n + '×'))}</div>
    </div>
    ${sel && sel.t !== 'kpi' ? resumoTabelaHTML(R) : ''}
  </div>`;
}

/* linhas da tabela conforme o que foi clicado */
function resumoTabela(R) {
    const D = state.dash, sel = D.raSel, nomeP = R.per.length === 4 ? `Ano ${R.per}` : nomeMes(R.per);
    const deOc = g => ({ n: g.atual, data: g.inicio, sit: situacao(g.atual) }), deAv = n => ({ n, data: n.data_encaminhamento, sit: situacao(n) });
    let linhas = [], rot = '', dataRot = 'Início';
    if (sel.t === 'kpi') {
        rot = (RA_KPIS.find(x => x[0] === sel.id) || ['', ''])[1];
        if (sel.id === 'entradas')
            linhas = R.ocs.map(deOc);
        if (sel.id === 'feitas') {
            linhas = R.avisos.map(deAv);
            dataRot = 'Encaminhado';
        }
        if (sel.id === 'baixas') {
            linhas = R.baixas.map(g => ({ n: g.atual, data: g.atual.data_baixa, sit: situacao(g.atual) }));
            dataRot = 'Data da baixa';
        }
        if (sel.id === 'multas') {
            linhas = R.multas.map(deAv);
            dataRot = 'Encaminhado';
        }
        if (sel.id === 'aberto') {
            linhas = R.aberto.map(deOc);
            rot = R.per.length === 4 ? 'Em aberto no fim do ano' : rot;
        }
    }
    else if (sel.t === 'loja') {
        const x = R.topLojas.find(y => y.k === sel.id);
        rot = x ? x.nome : '';
        linhas = R.ocs.filter(g => g.loja_id === sel.id).map(deOc);
    }
    else if (sel.t === 'tema') {
        const x = R.topTemas.find(y => y.k === sel.id);
        rot = x ? x.nome : '';
        linhas = R.ocs.filter(g => ocKey(g.nome) === sel.id).map(deOc);
    }
    else if (sel.t === 'multa') {
        const x = R.lojasMulta.find(y => y.k === sel.id);
        rot = x ? `Multas — ${x.nome}` : '';
        linhas = R.multas.filter(n => n.loja_id === sel.id).map(deAv);
        dataRot = 'Encaminhado';
    }
    else if (sel.t === 'reinc') {
        const x = R.reinc.find(y => y.k === sel.id);
        rot = x ? `${x.nome} — ${x.tema}` : '';
        linhas = R.ocs.filter(g => g.loja_id + '|' + ocKey(g.nome) === sel.id).map(deOc);
    }
    const q = (D.raBusca || '').trim().toLowerCase();
    linhas = linhas.filter(x => !q || lojaCasa(lojaDe(x.n), q));
    linhas = ordenar(linhas, D.raOrd || 'venc', { nome: x => lojaDe(x.n).nome, num: x => lojaDe(x.n).numero, venc: x => x.n.data_vencimento || '', tema: x => ocKey(x.n.infracao), seq: x => seqAviso(x.n) });
    return { k: 'ra', titulo: rot || 'Notificações', cab: `${rot} — ${nomeP}`, M: R.per, dataRot, linhas, arq: `resumo-${rot}-${R.per}` };
}

function resumoTabelaHTML(R) {
    const D = state.dash, T = resumoTabela(R);
    return `<div class="gr-box gr-tab" id="raTab" style="margin-top:14px"><div class="row" style="align-items:flex-start"><h3 style="margin:0">${esc(T.cab)} · ${plural(T.linhas.length, 'notificação', 'notificações')}</h3><button class="btn small secondary" data-act="raFechar">✕ Fechar</button></div>
    <div class="tab-barra"><div class="busca-loja"><span>🔎</span><input id="raBusca" placeholder="Pesquisar loja por nome/box" value="${esc(D.raBusca || '')}" autocomplete="off"></div>
      ${ordSel('raOrd', D.raOrd)}<button class="btn" data-act="raExport">⬇ Exportar Excel</button></div>
    <div id="raRes">${resumoTabelaRes()}</div></div>`;
}

function resumoTabelaRes() {
    const D = state.dash;
    if (!D.raSel)
        return '';
    const T = resumoTabela(resumoDados());
    return T.linhas.length ? grTabelaRes(T) : '<div class="empty">Nenhuma notificação.</div>';
}

/* ================= GRÁFICOS E COMPARAÇÕES ================= */
const COR_ATUAL = '#c8102e', COR_ANT = '#2f6fb3';

function mesAnt(m) {
    const [y, mm] = m.split('-').map(Number);
    return isoLocal(new Date(y, mm - 2, 1)).slice(0, 7);
}

function mesCurto(m) {
    const [y, mm] = m.split('-').map(Number);
    const t = new Date(y, mm - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return t.charAt(0).toUpperCase() + t.slice(1) + '/' + String(y).slice(2);
}

/* números de um mês (sempre contando notificações = ocorrências; avisos contados à parte) */
function metricasMes(ocs, m) {
    if (m > hoje().slice(0, 7))
        return { lojas: 0, novas: 0, avisos: 0, multas: 0, baixas: 0, abertas: 0, vencidas: 0, noPrazo: 0, total: 0, pendTot: 0 }; // mês que ainda não chegou
    const avisos = [];
    ocs.forEach(g => g.itens.forEach(n => {
        if ((n.data_encaminhamento || '').slice(0, 7) === m)
            avisos.push(n);
    }));
    const P = periodoDash(ocs, m);
    return {
        lojas: new Set(avisos.map(n => n.loja_id)).size,
        novas: ocs.filter(g => (g.inicio || '').slice(0, 7) === m).length,
        avisos: avisos.length,
        multas: avisos.filter(n => ehMulta(n.etapa)).length,
        baixas: P.baixas.length,
        abertas: P.abertas.length,
        vencidas: P.vencidas.length,
        noPrazo: P.noPrazo.length,
        total: saldoMes(ocs, m).length, /* só as que entraram no mês e ficaram sem baixa (não passa para o mês seguinte) */
        pendTot: P.abertas.length, /* todas as notificações sem baixa (qualquer mês) — cartão só no mês atual */
    };
}

/* SALDO DO MÊS: notificações que começaram no mês e ainda não tinham baixa no último dia do mês (ou hoje, no mês atual).
   Aumenta com cada notificação nova e diminui com cada baixa; cada mês começa do zero. Meses passados ficam como fecharam. */
function saldoMes(ocs, m) {
    const h = hoje(), ehAno = m.length === 4, [y, mm] = ehAno ? [+m, 12] : m.split('-').map(Number), fim = isoLocal(new Date(y, mm, 0)), ref = fim < h ? fim : h;
    return ocs.filter(g => (g.inicio || '').startsWith(m) && !(g.atual.baixada && (g.atual.data_baixa || h) <= ref));
}

const METRICAS = [['novas', 'Lojas entradas'], ['baixas', 'Baixas'], ['avisos', 'Notificações feitas'], ['total', 'Em aberto no fim do mês'], ['pendTot', 'Total pendente']];

function metricasDe(M) {
    return METRICAS.filter(x => x[0] !== 'pendTot' || M === hoje().slice(0, 7));
}

function mesesComDados() {
    const h = hoje().slice(0, 7);
    let ini = h;
    ocorrencias().lista.forEach(g => g.itens.forEach(n => {
        const m = (n.data_encaminhamento || '').slice(0, 7);
        if (m && m < ini)
            ini = m;
    }));
    const r = [];
    for (let m = h;; m = mesAnt(m)) {
        r.push(m);
        if (m <= ini || r.length >= 60)
            break;
    }
    if (r.length < 13)
        while (r.length < 13)
            r.push(mesAnt(r[r.length - 1]));
    return r; // do mais recente para o mais antigo
}

/* Mês principal: acompanha o mês atual automaticamente (setembro → outubro…), a menos que o usuário escolha outro */
function grMeses() {
    const D = state.dash, lista = mesesComDados(), atual = hoje().slice(0, 7);
    if (!D.grManual || !D.grA)
        D.grA = atual;
    if (!D.grBManual || !D.grB || D.grB === D.grA)
        D.grB = mesAnt(D.grA);
    if (!D.sitMes)
        D.sitMes = D.grA;
    return { A: D.grA, B: D.grB, lista };
}

const NOMES_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function lerSeletor(id) {
    const a = document.querySelector(`[data-per="${id}"][data-parte="ano"]`).value, m = document.querySelector(`[data-per="${id}"][data-parte="mes"]`).value;
    return { ano: a, mes: m };
}

function viewGraficos() {
    const D = state.dash, aba = D.grAba === 'ano' ? 'ano' : 'cmp';
    return `<div class="gr-abas"><button type="button" class="chip ${aba === 'cmp' ? 'active' : ''}" data-act="grAba" data-id="cmp">📈 Mês a mês</button><button type="button" class="chip ${aba === 'ano' ? 'active' : ''}" data-act="grAba" data-id="ano">📊 Resumo do ano</button></div>`
        + (aba === 'ano' ? resumoAnoHTML() : dashGraficosHTML(ocorrencias().lista));
}

function dashGraficosHTML(base) {
    const { A: M, B, lista } = grMeses(), D = state.dash;
    const SM = D.sitMes || M, sit = metricasMes(base, SM), nsm = nomeMes(SM);
    const cur = metricasMes(base, M), ant = metricasMes(base, B);
    const nm = nomeMes(M), nb = nomeMes(B), up = t => t.toUpperCase();
    const opt = sel => lista.map(m => `<option value="${m}" ${m === sel ? 'selected' : ''}>${nomeMes(m)}</option>`).join('');
    const MET = metricasDe(M), ek = D.evo && MET.some(x => x[0] === D.evo) ? D.evo : 'novas';
    const cards = MET.map(([k, t], i) => `<div class="cmp clic ${ek === k ? 'sel' : ''}" data-act="dashEvo" data-id="${k}" title="Mostrar no gráfico"><div class="t">${t}</div><div class="v" style="animation-delay:${i * 50}ms">${cur[k]}</div></div>`).join('');
    /* evolução: 13 meses (o mesmo mês do ano anterior até o mês escolhido); clique numa barra para ver a lista */
    const anoG = M.slice(0, 4), meses = Array.from({ length: 12 }, (_, i) => `${anoG}-${String(i + 1).padStart(2, '0')}`), vals = meses.map(m => metricasMes(base, m)[ek]), max = Math.max(...vals, 1);
    const tEvo = MET.find(x => x[0] === ek)[1], dr = D.drill;
    const evo = `<div class="evo">${meses.map((m, i) => {
        const v = vals[i], cls = m === M ? 'ref' : '', sel = m === (D.grTabMes || M);
        return `<div class="col ${cls} ${sel ? 'sel' : ''}" data-act="grMes" data-id="${m}" title="${esc(nomeMes(m))}: ${v}"><span class="num" style="animation-delay:${i * 45 + 300}ms">${v}</span><div class="barra" style="height:${v / max * 100}%;animation-delay:${i * 45}ms"></div></div>`;
    }).join('')}</div>
    <div class="evo-rot">${meses.map(m => `<span class="${m === M ? 'ref' : ''}">${mesCurto(m)}</span>`).join('')}</div>`;
    /* situação no mês principal (clique para ver a lista) */
    const tot = sit.noPrazo + sit.vencidas + sit.baixas;
    const selS = k => dr && dr.t === 'sit' && dr.c === k ? ' sel' : '';
    const seg = (k, v, c, t, i) => v ? `<div class="seg${selS(k)}" data-act="grSit" data-id="${k}" style="flex:${v};background:${c};animation-delay:${i * 120}ms" data-tip="${t}: ${v} (${Math.round(v / tot * 100)}%)\nClique para ver a lista">${v / tot > .08 ? v : ''}</div>` : '';
    const situ = tot ? `<div class="stack">${seg('prazo', sit.noPrazo, '#1f8a4c', 'No prazo', 0)}${seg('vencidas', sit.vencidas, '#c8102e', 'Vencidas', 1)}${seg('baixas', sit.baixas, '#7a7a7a', 'Baixadas no mês', 2)}</div>
    <div class="stack-leg"><button type="button" class="leg-btn${selS('prazo')}" data-act="grSit" data-id="prazo"><i style="background:#1f8a4c"></i>✓ No prazo: <b>${sit.noPrazo}</b></button><button type="button" class="leg-btn${selS('vencidas')}" data-act="grSit" data-id="vencidas"><i style="background:#c8102e"></i>⚠ Vencidas: <b>${sit.vencidas}</b></button><button type="button" class="leg-btn${selS('baixas')}" data-act="grSit" data-id="baixas"><i style="background:#7a7a7a"></i>✔ Baixadas no mês: <b>${sit.baixas}</b></button></div>
    <p class="sub" style="margin:8px 0 0">Total: <b>${tot}</b> · em aberto no fim do mês + baixas do mês</p>` : `<div class="empty">Sem notificações em ${nsm}.</div>`;
    const ano = M.slice(0, 4), atual = hoje().slice(0, 7);
    const antigos = {};
    base.filter(g => g.aberta && (g.inicio || '') < anoG + '-01-01').forEach(g => {
        const a = g.inicio.slice(0, 4);
        (antigos[a] = antigos[a] || []).push(g);
    });
    const avisoAnt = Object.keys(antigos).sort().map(a => {
        const gs = antigos[a], m1 = gs.map(g => g.inicio.slice(0, 7)).sort()[0];
        return `<div class="pend-ant">⚠ <b>${plural(gs.length, 'notificação pendente', 'notificações pendentes')} de ${a}</b> <button type="button" class="btn small" data-act="grMes" data-id="${m1}">Ver ${a}</button></div>`;
    }).join('');
    return `<div class="card gr-sec"><div class="gr-topo"><div><h2>📈 Mês a mês</h2><p class="sub" style="margin:4px 0 0">Clique nos cartões para trocar o gráfico e nos meses para ver a lista.</p></div>
      <div class="acoes" style="margin:0"><button class="btn" data-act="exportRelatorio">⬇ Relatório ${ano} (Excel)</button><button class="btn secondary" data-act="exportAnalise">⬇ Dados para análise</button></div></div>
    <div class="gr-meses">
      ${mesPicker('grA', M)}
      <div class="gr-vs" style="text-align:left"><b>${up(nm)}</b>${M !== atual ? '<button class="chip" data-act="grAtual" style="display:block;margin:8px 0 0">↺ Voltar ao mês atual</button>' : '<span class="gr-auto" style="display:block">● mês atual — muda sozinho a cada mês</span>'}</div>
    </div>
    <div class="cmp-grid">${cards}</div>
    <div class="gr-dupla" style="grid-template-columns:1fr">
      <div class="gr-box"><h3>Gráfico de notificações emitidas</h3><span class="sub">Mostrando: <b style="color:#141414">${tEvo}</b> · janeiro a dezembro de ${anoG} · <b style="color:${COR_ATUAL}">■ ${nm}</b> · clique num cartão acima para trocar e num mês para escolher o mês</span>${avisoAnt}${evo}</div>
    </div>
    ${grTabelaHTML()}</div>`;
}

/* TABELA DE LOJAS embaixo do gráfico: acompanha o cartão escolhido e o mês (clique numa barra para trocar o mês) */
function grTabelaDados() {
    const D = state.dash, base = ocorrencias().lista, M = grMeses().A, MET = metricasDe(M), k = D.evo && MET.some(x => x[0] === D.evo) ? D.evo : 'novas';
    const P = periodoDash(base, M), q = (D.grBusca || '').trim().toLowerCase();
    let linhas;
    if (k === 'avisos') {
        linhas = [];
        base.forEach(g => g.itens.forEach(n => {
            if ((n.data_encaminhamento || '').slice(0, 7) === M)
                linhas.push({ n, data: n.data_encaminhamento, sit: situacao(n) });
        }));
    }
    else if (k === 'baixas') {
        linhas = P.baixas.map(g => ({ n: g.atual, data: g.atual.data_baixa, sit: situacao(g.atual) }));
    }
    else {
        const gs = k === 'pendTot' ? P.abertas : k === 'total' ? saldoMes(base, M) : base.filter(g => (g.inicio || '').slice(0, 7) === M);
        linhas = gs.map(g => {
            const n = P.avisoEm(g);
            return { n, data: g.inicio, sit: situacao(g.atual) };
        });
    }
    linhas = linhas.filter(x => !q || lojaCasa(lojaDe(x.n), q));
    linhas = ordenar(linhas, D.grOrd || 'venc', { nome: x => lojaDe(x.n).nome, num: x => lojaDe(x.n).numero, venc: x => x.n.data_vencimento || '', tema: x => ocKey(x.n.infracao), seq: x => seqAviso(x.n) });
    return { M, k, titulo: MET.find(x => x[0] === k)[1], linhas };
}

function grTabelaHTML() {
    const D = state.dash, T = grTabelaDados();
    return `<div class="gr-box gr-tab" id="grTab"><div class="row" style="align-items:flex-start"><div><h3 style="margin:0">Lojas — ${esc(T.titulo)} · ${esc(nomeMes(T.M))}</h3><span class="sub">Muda junto com o cartão escolhido e com o mês clicado no gráfico</span></div></div>
    <div class="tab-barra"><div class="busca-loja"><span>🔎</span><input id="grBusca" placeholder="Pesquisar loja por nome/box" value="${esc(D.grBusca || '')}" autocomplete="off"></div>
      ${ordSel('grOrd', D.grOrd)}<button class="btn" data-act="grExportTab">⬇ Exportar Excel</button></div>
    <div id="grTabRes">${grTabelaRes()}</div></div>`;
}

function grTabelaRes(T0) {
    const T = T0 || grTabelaDados();
    if (!T.linhas.length)
        return '<div class="empty">Nenhuma notificação neste mês para este cartão.</div>';
    return `<div class="scrollx" style="margin-top:10px"><table><thead><tr><th>Loja</th><th>Nº da loja</th><th>Infração</th><th>Aviso</th><th>Nº do aviso</th><th>${T.dataRot || (T.k === 'baixas' ? 'Data da baixa' : T.k === 'avisos' ? 'Encaminhado' : 'Início')}</th><th>Vencimento</th><th>Situação</th></tr></thead><tbody>${T.linhas.map(({ n, data, sit }) => {
        const l = lojaDe(n);
        return `<tr data-act="det" data-id="${n.id}" title="Ver a notificação em tela grande"><td><b>${esc(l.nome)}</b></td><td>${esc(l.numero)}</td><td>${esc(n.infracao)}</td><td>${etapaPill(n)}</td><td>${esc(n.numero_notificacao)}</td><td>${fmtDate(data)}</td><td>${fmtDate(n.data_vencimento)}</td><td><span class="pill ${sit.cls}">${esc(sit.label)}</span></td></tr>`;
    }).join('')}</tbody></table></div>${totalRodape(T.titulo, T.linhas.length)}`;
}

function exportarTabelaGraf(T0, opt = {}) {
    const T = T0 || grTabelaDados(), D = state.dash, ordV = opt.ord ?? D.grOrd, busca = opt.busca ?? D.grBusca;
    if (!T.linhas.length)
        return toast('Não há nada na tabela para exportar.', 'bad');
    const E = XL.estilos(), st = o => E.st(o), agora = new Date(), VERM = 'C8102E', PRETO = '141414', BORDA = 'D9D9D9';
    const S = { tit: st({ font: { b: 1, sz: 16, cor: VERM } }), info: st({ font: { i: 1, sz: 9, cor: '6B6B6B' } }), faixa: st({ fill: VERM }), cab: st({ font: { b: 1, sz: 10, cor: 'FFFFFF' }, fill: PRETO, borda: '404040', h: 'center', wrap: 1 }),
        c: (z, o = {}) => st({ font: { sz: 10, ...(o.font || {}) }, fill: z ? 'F7F7F7' : null, borda: BORDA, h: o.h || 'center', data: o.data, wrap: o.wrap }) };
    const cols = ['Loja', 'Nº da loja', 'Infração', 'Aviso', 'Nº do aviso', 'Data', 'Vencimento', 'Situação'];
    const ordem = (ORDENS.find(x => x[0] === (ordV || 'venc')) || ['', ''])[1].replace(/^\S+\s/, '');
    const L = [{ ht: 26, cells: [{ v: (T.cab || `${T.titulo} — ${nomeMes(T.M)}`).toUpperCase(), s: S.tit }] },
        { ht: 16, cells: [{ v: `${EMPRESA} · gerado em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por ${usuarioAtual?.nome || ''} · ordem: ${ordem}${busca ? ` · pesquisa: ${busca}` : ''}`, s: S.info }] },
        { ht: 4, cells: cols.map(() => ({ v: '', s: S.faixa })) }, { ht: 8, cells: [] }, { ht: 24, cells: cols.map(v => ({ v, s: S.cab })) }];
    T.linhas.forEach(({ n, data, sit }, i) => {
        const l = lojaDe(n), z = i % 2;
        L.push({ ht: (n.infracao || '').length > 38 ? 32 : 18, cells: [{ v: l.nome, s: S.c(z, { h: 'left', font: { b: 1 } }) }, { v: String(l.numero), s: S.c(z) }, { v: n.infracao || '', s: S.c(z, { h: 'left', wrap: 1 }) }, { v: ETAPAS[n.etapa] || '', s: S.c(z) }, { v: n.numero_notificacao || '', s: S.c(z) }, { v: XL.data(data), s: S.c(z, { data: 1 }) }, { v: XL.data(n.data_vencimento), s: S.c(z, { data: 1 }) }, { v: sit.label, s: S.c(z, { font: sit.key === 'vencida' ? { b: 1, cor: VERM } : {} }) }] });
    });
    L.push({ ht: 20, cells: [{ v: `TOTAL: ${T.linhas.length}`, s: S.cab }] });
    const aba = { nome: 'Lojas', xml: XL.planilha({ linhas: L, larguras: [30, 11, 38, 14, 14, 12, 13, 24], mesclas: ['A1:H1', 'A2:H2'], filtro: `A5:H${4 + T.linhas.length + 1}`, rodape: `${EMPRESA}` }) };
    baixarArquivo(XL.livro([aba], E), (T.arq || `lojas-${T.titulo}-${T.M}`).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '-').toLowerCase() + '.xlsx');
    toast('Excel gerado com as lojas da tabela.');
}

function totalRodape(rotulo, n) {
    return `<div class="total-rodape"><span>${esc(rotulo)}</span><span>— TOTAL:</span><b>${n}</b></div>`;
}

/* tooltip dos gráficos */
(() => {
    const tip = document.createElement('div');
    tip.id = 'gTip';
    document.body.appendChild(tip);
    document.addEventListener('mousemove', e => {
        const el = e.target.closest && e.target.closest('[data-tip]');
        if (!el) {
            tip.style.display = 'none';
            return;
        }
        tip.textContent = el.dataset.tip;
        tip.style.display = 'block';
        const w = tip.offsetWidth, h = tip.offsetHeight;
        let x = e.clientX + 14, y = e.clientY + 14;
        if (x + w > innerWidth - 8)
            x = e.clientX - w - 14;
        if (y + h > innerHeight - 8)
            y = e.clientY - h - 14;
        tip.style.left = x + 'px';
        tip.style.top = y + 'px';
    });
})();
