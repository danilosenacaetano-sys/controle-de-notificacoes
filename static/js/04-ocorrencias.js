/*
 * 04-ocorrencias.js
 * Regra principal do sistema: cada infração de uma loja é UMA notificação (1º, 2º, 3º aviso e multa são etapas dela).
 */

/* =====================================================================
   REGRA DO SISTEMA
   NOTIFICAÇÃO = OCORRÊNCIA (uma infração de uma loja)
   AVISO       = ETAPA da ocorrência (1º aviso → 2º aviso → 3º aviso → multa)
   Um novo aviso NÃO cria nova notificação; o aviso anterior fica no histórico
   e somente o AVISO ATUAL aparece em Vencimentos e nas contagens.
   ===================================================================== */
const state = { tab: 'home', loja: null, oc: null, qLoja: '', venc: 'todas', vencBusca: '', vencOrdem: 'venc', vencAno: '', vencMes: '', dash: { mes: hoje().slice(0, 7), loja: '', busca: '', cons: 'abertas', consBusca: '', consVer: 'notif', lojaFiltro: 'todas' }, hist: { nome: '', numero: '', ano: '', tema: '', temaExato: false, etapa: '', loja: '' } };

function lojasAlfa() {
    return [...store.lojas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || String(a.numero).localeCompare(String(b.numero), 'pt-BR', { numeric: true }));
}

function lojaDe(n) {
    return store.lojas.find(l => l.id === n.loja_id) || { numero: n.numero_loja || '?', nome: n.nome_loja || '(loja removida)' };
}

function notifPorId(id) {
    return store.notificacoes.find(n => n.id === id) || (store.avulsas || []).find(n => n.id === id);
}

function ocKey(t) {
    return (t || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}

const ETAPA_ORD = new Proxy({}, { get: (_, k) => numAviso(k) || (ehMulta(k) ? 1000 + numMulta(k) : 0) });
const pad3 = n => String(n).padStart(3, '0');

function chaveNotif(n) {
    const t = (n.numero_notificacao || '').trim();
    const m = /^(\d+)\s*[\/\-.]\s*(\d{2,4})$/.exec(t);
    if (m) {
        let ano = +m[2];
        if (ano < 100)
            ano += 2000;
        return [ano, +m[1], t];
    }
    const d = /\d+/.exec(t);
    return [+(n.data_encaminhamento || '0').slice(0, 4) || 0, d ? +d[0] : Infinity, t];
}

function ordemNotif(a, b) {
    const x = chaveNotif(a), y = chaveNotif(b);
    return (x[0] - y[0]) || (x[1] - y[1]) || x[2].localeCompare(y[2], 'pt-BR', { numeric: true });
}

function ordemHist(a, b) {
    const la = lojaDe(a), lb = lojaDe(b);
    return la.nome.localeCompare(lb.nome, 'pt-BR') || String(la.numero).localeCompare(String(lb.numero), 'pt-BR', { numeric: true }) || String(a.loja_id).localeCompare(String(b.loja_id)) || ordemNotif(a, b);
}

function anoNotif(n) {
    return (n.data_encaminhamento || '').slice(0, 4) || ((/\/(\d{4})$/.exec(n.numero_notificacao || '') || [])[1]) || '';
}

/* Monta as ocorrências a partir dos avisos registrados.
   - Um aviso emitido pelo botão "Emitir próximo aviso" fica ligado ao anterior (origem_id).
   - Avisos antigos sem ligação: um 2º/3º aviso/multa da mesma loja e mesma infração entra na ocorrência que estava em aberto.
   - Um 1º aviso sempre começa uma nova ocorrência. */
function ocorrencias() {
    if (_ocCache)
        return _ocCache;
    const ord = [...store.notificacoes].sort((a, b) => (a.data_encaminhamento || '').localeCompare(b.data_encaminhamento || '') || ordemNotif(a, b));
    const grupoDe = new Map(), ultimoPorChave = new Map(), grupos = [];
    const pendentes = [];
    for (const n of ord) {
        let g = null;
        if (n.origem_id) {
            g = grupoDe.get(n.origem_id) || null;
            if (!g && notifPorId(n.origem_id)) {
                pendentes.push(n);
                continue;
            }
        }
        if (!g && n.etapa !== '1') {
            const c = ultimoPorChave.get(n.loja_id + '|' + ocKey(n.infracao));
            if (c && !c.atual.baixada)
                g = c;
        }
        if (!g) {
            g = { id: n.id, loja_id: n.loja_id, itens: [] };
            grupos.push(g);
        }
        g.itens.push(n);
        g.atual = n;
        grupoDe.set(n.id, g);
        ultimoPorChave.set(n.loja_id + '|' + ocKey(n.infracao), g);
    }
    for (const n of pendentes) {
        const g = grupoDe.get(n.origem_id) || (() => {
            const x = { id: n.id, loja_id: n.loja_id, itens: [] };
            grupos.push(x);
            return x;
        })();
        g.itens.push(n);
        grupoDe.set(n.id, g);
    }
    for (const g of grupos) {
        /* ordem real de emissão: cada aviso emitido pelo botão fica ligado ao anterior (origem_id);
           por isso a posição na corrente vem primeiro, depois a data, o tipo e o número */
        const noGrupo = new Set(g.itens.map(n => n.id)), prof = {};
        const profundidade = n => {
            if (prof[n.id] != null)
                return prof[n.id];
            prof[n.id] = 0;
            const o = n.origem_id && noGrupo.has(n.origem_id) ? notifPorId(n.origem_id) : null;
            return prof[n.id] = o ? profundidade(o) + 1 : 0;
        };
        g.itens.sort((a, b) => profundidade(a) - profundidade(b) || (a.data_encaminhamento || '').localeCompare(b.data_encaminhamento || '') || (ETAPA_ORD[a.etapa] || 0) - (ETAPA_ORD[b.etapa] || 0) || ordemNotif(a, b));
        g.atual = g.itens[g.itens.length - 1];
        g.nome = (g.atual.infracao || '(sem descrição)').trim();
        g.aberta = !g.atual.baixada;
        g.inicio = g.itens[0].data_encaminhamento || '';
        g.ano = anoNotif(g.itens[0]);
        g.vencida = g.aberta && g.atual.data_vencimento < hoje();
    }
    _ocCache = { lista: grupos, de: grupoDe };
    return _ocCache;
}

function ocDe(n) {
    return ocorrencias().de.get(n.id);
}

/* próximo aviso = maior aviso da notificação + 1; próxima multa = quantidade de multas + 1 */
function proximaEtapa(g, tipo) {
    const itens = g ? g.itens : [];
    if (tipo === 'multa')
        return codMulta(itens.filter(n => ehMulta(n.etapa)).length + 1);
    return String(Math.max(0, ...itens.map(n => numAviso(n.etapa))) + 1);
}

function ocsAbertas() {
    return ocorrencias().lista.filter(g => g.aberta);
}

function ocsDaLoja(id) {
    return ocorrencias().lista.filter(g => g.loja_id === id);
}

function abertasDaLoja(id) {
    return ocsDaLoja(id).filter(g => g.aberta);
}

function situacao(n) {
    if (n.baixada)
        return { label: 'Baixa', cls: 'neutral', key: 'baixada' };
    const g = ocDe(n);
    if (g && g.atual !== n) {
        const i = g.itens.indexOf(n), prox = g.itens[i + 1];
        return { label: `Substituído pelo ${ETAPAS[prox?.etapa] || 'próximo aviso'}`, cls: 'neutral', key: 'substituido' };
    }
    if (g && g.atual.baixada)
        return { label: 'Encerrada', cls: 'neutral', key: 'baixada' };
    const r = diffDias(hoje(), n.data_vencimento);
    if (r < 0)
        return { label: `Vencida há ${-r} dia${-r === 1 ? '' : 's'}`, cls: 'bad', key: 'vencida' };
    if (r === 0)
        return { label: 'Vence hoje', cls: 'warn', key: 'prazo' };
    if (r <= 2)
        return { label: `Vence em ${r} dia${r === 1 ? '' : 's'}`, cls: 'warn', key: 'prazo' };
    return { label: 'Dentro do prazo', cls: 'ok', key: 'prazo' };
}

/* PDFs de uma notificação (pode ter vários) */
function pdfsDe(n) {
    return n && n.pdfs ? n.pdfs : (n && n.tem_pdf ? [{ id: 'principal', nome: 'PDF' }] : []);
}

function urlPdf(nid, p) {
    return p.id === 'principal' ? `/api/notificacoes/${nid}/pdf` : `/api/notificacoes/${nid}/pdfs/${p.id}`;
}

function qtPdf(n) {
    const q = pdfsDe(n).length;
    return q > 1 ? ` (${q})` : '';
}

function etapaPill(n) {
    return `<span class="pill ${ehMulta(n.etapa) ? 'bad' : 'info'}">${ETAPAS[n.etapa] || '—'}</span>`;
}

function sugerirNumero() {
    const ano = hoje().slice(0, 4);
    let max = 0;
    store.notificacoes.forEach(n => {
        const m = /^(\d+)\/(\d{4})$/.exec((n.numero_notificacao || '').trim());
        if (m && m[2] === ano)
            max = Math.max(max, +m[1]);
    });
    return `${pad3(max + 1)}/${ano}`;
}

function lojaCasa(l, q) {
    if (!q)
        return true;
    const num = String(l.numero).toLowerCase();
    const soDig = q.replace(/^0+/, ''), numDig = num.replace(/^0+/, '');
    return l.nome.toLowerCase().includes(q) || num.includes(q) || (/^\d+$/.test(q) && soDig !== '' && numDig === soDig);
}

const plural = (q, s, p) => `${q} ${q === 1 ? s : p}`;
