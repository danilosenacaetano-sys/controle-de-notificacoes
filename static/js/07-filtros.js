/*
 * 07-filtros.js
 * Componentes de filtro usados em várias telas: seletor de período (ano e mês) e "Ordenar por".
 */

/* ===== SELETOR DE PERÍODO (anos em números + 12 meses) =====
   valor: '' = todos · 'AAAA' = ano inteiro · 'AAAA-MM' = um mês */
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function anosComDados() {
    const a = new Set([hoje().slice(0, 4)]);
    store.notificacoes.forEach(n => {
        [n.data_encaminhamento, n.data_vencimento].forEach(d => {
            if (d)
                a.add(d.slice(0, 4));
        });
    });
    return [...a].sort();
}

function textoPer(v, vazio) {
    return !v ? vazio : /^\d{4}$/.test(v) ? `Ano inteiro de ${v}` : nomeMes(v).toLowerCase();
}

const MP_OPC = { venc: { rotulo: 'Período do vencimento', todos: true, anoInteiro: true, futuro: true, vazio: 'Todas as notificações' },
    dashMes: { rotulo: 'Mês de referência', todos: true, anoInteiro: true, futuro: false, vazio: 'Todo o período' },
    raAno: { rotulo: 'Ano', soAno: true, anoInteiro: true, todos: false, futuro: false, dir: true },
    grA: { rotulo: 'Mês', todos: false, anoInteiro: false, futuro: false, cor: 'a' }, grB: { rotulo: 'Comparar com', todos: false, anoInteiro: false, futuro: false, cor: 'b', dir: true } };

function mesPicker(id, v) {
    const o = MP_OPC[id], aberto = state.pop && state.pop.id === id, at = hoje().slice(0, 7);
    const anoVer = aberto && state.pop.ano ? state.pop.ano : (v ? v.slice(0, 4) : at.slice(0, 4));
    const pop = aberto ? `<div class="mp-pop">
      <div class="mp-sec">ANO${o.anoInteiro && !o.soAno ? ' <span style="font-weight:500;letter-spacing:0">(clique para ver o ano inteiro)</span>' : ''}</div>
      <div class="mp-grade">${anosComDados().map(a => `<button type="button" class="${o.anoInteiro && v === a ? 'sel' : a === anoVer ? 'ano-at' : ''}" data-act="mpAno" data-id="${id}|${a}">${a}</button>`).join('')}</div>
      ${o.soAno ? '' : `<div class="mp-sec">MÊS DE ${anoVer}</div>`}
      ${o.soAno ? '' : `<div class="mp-grade">${MESES_CURTOS.map((n, i) => {
        const m = `${anoVer}-${String(i + 1).padStart(2, '0')}`;
        return `<button type="button" class="${v === m ? 'sel' : ''}" data-act="mpMes" data-id="${id}|${m}" ${!o.futuro && m > at ? 'disabled' : ''}>${n}</button>`;
    }).join('')}</div>`}
      ${o.soAno ? '' : `<div class="mp-rod">${o.todos ? `<button type="button" data-act="mpTodos" data-id="${id}">Todos</button>` : '<span></span>'}<button type="button" data-act="mpMes" data-id="${id}|${at}">Este mês</button></div>`}</div>` : '';
    return `<div class="mp ${o.cor || ''} ${o.dir ? 'dir' : ''}" data-mp="${id}"><span class="mp-rot">${o.rotulo}</span><button type="button" class="mp-campo" data-act="mpAbrir" data-id="${id}"><span>${esc(o.soAno ? v : textoPer(v, o.vazio))}</span><span class="ic">📅</span></button>${pop}</div>`;
}

function escolherPeriodo(id, v) {
    const D = state.dash, at = hoje().slice(0, 7);
    if (id === 'venc') {
        state.vencAno = v.slice(0, 4);
        state.vencMes = v.length > 4 ? v.slice(5, 7) : '';
    }
    if (id === 'dashMes') {
        D.mes = v;
    }
    if (id === 'raAno') {
        D.raAno = v.slice(0, 4);
        D.raMes = '';
        D.raSel = null;
    }
    if (id === 'grA') {
        if (v > at)
            v = at;
        D.grA = v;
        D.grManual = v !== at;
        if (!D.grBManual || D.grB === v)
            D.grB = mesAnt(v);
        D.sitMes = v;
        D.grTabMes = '';
        D.drill = null;
    }
    if (id === 'grB') {
        if (v > at)
            v = at;
        D.grB = v;
        D.grBManual = true;
    }
    state.pop = null;
    render();
}

document.addEventListener('mousedown', e => {
    if (state.pop && !e.target.closest('.mp')) {
        state.pop = null;
        render();
    }
});

/* ===== ORDENAR POR (mesmo botão em todas as tabelas) ===== */
const ORDENS = [['venc', '📅 Data de vencimento'], ['nome', '🔤 Nome da loja (A–Z)'], ['numero', '🔢 Número da loja']];

function ordSel(id, v) {
    return `<label class="ord-sel">Ordenar por <select id="${id}">${ORDENS.map(([k, t]) => `<option value="${k}" ${(v || 'venc') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
}

/* nome/número da loja: as linhas da mesma loja ficam juntas → mesmo tema junto → sequência dos avisos (1º, 2º, 3º, multa) */
function ordenar(lista, O, { nome, num, venc, tema = () => '', seq = () => '' }) {
    const cN = (a, b) => String(num(a)).localeCompare(String(num(b)), 'pt-BR', { numeric: true }), cT = (a, b) => String(nome(a)).localeCompare(String(nome(b)), 'pt-BR', { sensitivity: 'base' }), cV = (a, b) => (venc(a) || '9999').localeCompare(venc(b) || '9999');
    const cTe = (a, b) => String(tema(a)).localeCompare(String(tema(b)), 'pt-BR'), cS = (a, b) => String(seq(a)).localeCompare(String(seq(b)));
    return [...lista].sort(O === 'nome' ? (a, b) => cT(a, b) || cN(a, b) || cTe(a, b) || cS(a, b) || cV(a, b) : O === 'numero' ? (a, b) => cN(a, b) || cT(a, b) || cTe(a, b) || cS(a, b) || cV(a, b) : (a, b) => cV(a, b) || cT(a, b));
}

/* chave de sequência de um aviso: ocorrência (mais antiga primeiro) → etapa (1º, 2º, 3º, multa) → data */
function seqAviso(n) {
    const g = ocDe(n);
    return `${g?.inicio || n.data_encaminhamento || ''}|${String(ETAPA_ORD[n.etapa] || 0).padStart(5, '0')}|${n.data_encaminhamento || ''}`;
}

function seqOc(g) {
    return `${g.inicio || ''}|${g.id}`;
}

/* etiquetas de infração: uma por notificação, cor pela situação (vermelho vencida · verde no prazo · cinza com baixa) */
function tagsInfracao(gs, P) {
    return `<div class="inf-tags">${[...gs].sort((a, b) => ocKey(a.nome).localeCompare(ocKey(b.nome)) || (a.inicio || '').localeCompare(b.inicio || '')).map(g => {
        const n = P ? P.avisoEm(g) : g.atual, pend = P ? P.abertas.includes(g) : g.aberta, ven = pend && (P ? vencOc(g, P) < P.ref : g.vencida);
        const c = ven ? 'bad' : pend ? 'ok' : 'neutral', ic = ven ? '🔴' : pend ? '🟢' : '⚪', st = ven ? 'vencida' : pend ? 'no prazo' : 'com baixa';
        return `<button type="button" class="inf-tag ${c}" data-act="det" data-id="${n.id}" title="Abrir esta notificação">${ic} <b>${esc(g.nome)}</b> · ${esc(ETAPAS[n.etapa] || '')} · ${st}</button>`;
    }).join('')}</div>`;
}
