/*
 * 02-constantes.js
 * Constantes gerais: etapas (avisos e multas), motivos de baixa, abas e módulos da tela inicial.
 */

/* Avisos e multas SEM LIMITE:
   aviso  -> '1','2','3','4',...   (1º aviso, 2º aviso, ...)
   multa  -> 'multa','multa2','multa3',...   (1ª multa, 2ª multa, ...) */
function ehMulta(e) {
    return /^multa/.test(e || '');
}

function numMulta(e) {
    const m = /^multa(\d*)$/.exec(e || '');
    return m ? (+m[1] || 1) : 0;
}

function numAviso(e) {
    return /^\d+$/.test(e || '') ? +e : 0;
}

function etapaLabel(e) {
    if (numAviso(e))
        return `${numAviso(e)}º aviso`;
    if (ehMulta(e)) {
        const k = numMulta(e);
        return k === 1 ? 'Multa' : `${k}ª multa`;
    }
    return '—';
}

function codMulta(k) {
    return k <= 1 ? 'multa' : 'multa' + k;
}

const ETAPAS = new Proxy({}, { get: (_, k) => typeof k === 'string' ? etapaLabel(k) : undefined });

/* lista de opções do campo "Aviso" (vai até 10º aviso e 5ª multa, ou mais se já existir) */
function opcoesEtapa(atual) {
    const maxA = Math.max(10, numAviso(atual)), maxM = Math.max(5, numMulta(atual));
    const l = [];
    for (let i = 1; i <= maxA; i++)
        l.push([String(i), etapaLabel(String(i))]);
    for (let k = 1; k <= maxM; k++)
        l.push([codMulta(k), k === 1 ? '1ª multa' : etapaLabel(codMulta(k))]);
    return l;
}

const MOTIVOS = { regularizada: 'Regularizada', reiterada: 'Reiterada', multa: 'Multa aplicada', cancelada: 'Cancelada', outro: 'Outro' };

const TABS = [['home', 'Início'], ['manut', 'Manutenção'], ['venc', 'Vencimentos'], ['dash', 'Dashboard'], ['graf', 'Gráficos'], ['hist', 'Histórico'], ['dados', 'Dados / Backup']];
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

const MODULOS = [
    { id: 'manut', titulo: 'Manutenção', desc: 'Lojas com notificações em aberto, avisos e baixas.', ico: svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>') },
    { id: 'venc', titulo: 'Vencimentos', desc: 'Prazo do aviso atual de cada notificação em aberto.', ico: svg('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v3l2 1"/>') },
    { id: 'dash', titulo: 'Dashboard', desc: 'Indicadores, consultas e pesquisa por loja.', ico: svg('<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/>') },
    { id: 'graf', titulo: 'Gráficos', desc: 'Comparações entre meses, evolução e relatórios em Excel.', ico: svg('<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/><circle cx="19" cy="8" r="1.5"/>') },
    { id: 'hist', titulo: 'Histórico', desc: 'Consulta de todas as notificações, inclusive as encerradas.', ico: svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 3"/>') },
    { id: 'dados', titulo: 'Dados / Backup', desc: 'Backup, registro de alterações e Excel.', ico: svg('<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>') },
];
