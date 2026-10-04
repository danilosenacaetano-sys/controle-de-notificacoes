/*
 * 09-excel-relatorios.js
 * Relatórios em Excel: relatório simples, relatório do ano com gráficos e planilha para análise.
 */

/* ================= RELATÓRIO SIMPLES (Excel) ================= */
function exportarRelatorio(ano) {
    const base = ocorrencias().lista, E = XL.estilos(), st = o => E.st(o), agora = new Date(), h = hoje();
    const VERM = 'C8102E', AZUL = '2F6FB3', PRETO = '141414', CINZA = '7A7A7A', BORDA = 'D9D9D9';
    const S = { titulo: st({ font: { b: 1, sz: 20, cor: VERM } }), sub: st({ font: { b: 1, sz: 13, cor: PRETO } }), info: st({ font: { i: 1, sz: 9, cor: '6B6B6B' } }), faixa: st({ fill: VERM }),
        sec: st({ font: { b: 1, sz: 12, cor: VERM } }), cab: st({ font: { b: 1, sz: 10, cor: 'FFFFFF' }, fill: PRETO, borda: '404040', h: 'center', wrap: 1 }),
        kRot: st({ font: { b: 1, sz: 9, cor: 'FFFFFF' }, fill: VERM, h: 'center', wrap: 1 }), kVal: st({ font: { b: 1, sz: 22, cor: PRETO }, fill: 'FDE8EB', h: 'center', borda: 'F3B7C1' }),
        tot: st({ font: { b: 1, sz: 10, cor: 'FFFFFF' }, fill: VERM, borda: '404040', h: 'center' }), totL: st({ font: { b: 1, sz: 10, cor: 'FFFFFF' }, fill: VERM, borda: '404040', h: 'left' }),
        c: (z, o = {}) => st({ font: { sz: 10, ...(o.font || {}) }, fill: o.fill || (z ? 'F5F5F5' : null), borda: BORDA, h: o.h || 'center', wrap: o.wrap, data: o.data }),
        n: st({ font: { sz: 10 }, h: 'center' }), d: st({ font: { sz: 10 }, data: 1, h: 'center' }), txt: st({ font: { sz: 10 } }) };
    const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`), nomesM = meses.map(m => NOMES_MES[+m.slice(5) - 1]);
    const dados = meses.map(m => metricasMes(base, m));
    const avAno = [];
    base.forEach(g => g.itens.forEach(n => {
        if ((n.data_encaminhamento || '').slice(0, 4) === ano)
            avAno.push(n);
    }));
    const ocAno = base.filter(g => (g.inicio || '').slice(0, 4) === ano);
    const soma = k => dados.reduce((a, x) => a + x[k], 0);
    const kpis = [['Notificações no ano', ocAno.length], ['Avisos emitidos', avAno.filter(n => !ehMulta(n.etapa)).length], ['Multas aplicadas', avAno.filter(n => ehMulta(n.etapa)).length], ['Baixas no ano', soma('baixas')], ['Lojas notificadas', new Set(avAno.map(n => n.loja_id)).size], ['Em aberto hoje', ocorrencias().lista.filter(g => g.aberta).length]];
    const R = [{ ht: 34, cells: [{ v: EMPRESA.toUpperCase(), s: S.titulo }] }, { ht: 22, cells: [{ v: `Relatório de notificações — ${ano}`, s: S.sub }] },
        { ht: 16, cells: [{ v: `Gerado em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · 1 notificação = 1 ocorrência (2º/3º aviso e multa são etapas dela)`, s: S.info }] },
        { ht: 5, cells: Array.from({ length: 12 }, () => ({ v: '', s: S.faixa })) }, { ht: 10, cells: [] },
        { ht: 30, cells: kpis.flatMap(([t]) => [{ v: t, s: S.kRot }, { v: '', s: S.kRot }]) },
        { ht: 44, cells: kpis.flatMap(([, v]) => [{ v, s: S.kVal }, { v: '', s: S.kVal }]) }, { ht: 14, cells: [] },
        { ht: 22, cells: [{ v: 'Mês a mês', s: S.sec }] }];
    const cols = ['Mês', 'Notificações novas', 'Avisos emitidos', 'Multas aplicadas', 'Baixas', 'Lojas notificadas'];
    R.push({ ht: 30, cells: cols.map(v => ({ v, s: S.cab })) });
    const L0 = R.length + 1;
    dados.forEach((x, i) => {
        const z = i % 2, fut = meses[i] > h.slice(0, 7);
        R.push({ ht: 19, cells: [{ v: nomesM[i], s: S.c(z, { h: 'left', font: { b: 1 } }) }, { v: fut ? '' : x.novas, s: S.c(z, { font: { b: 1 } }) }, { v: fut ? '' : x.avisos - x.multas, s: S.c(z) }, { v: fut ? '' : x.multas, s: S.c(z, { font: { cor: VERM } }) }, { v: fut ? '' : x.baixas, s: S.c(z) }, { v: fut ? '' : x.lojas, s: S.c(z) }] });
    });
    const L1 = R.length;
    R.push({ ht: 22, cells: [{ v: 'TOTAL', s: S.totL }, { v: ocAno.length, s: S.tot }, { v: kpis[1][1], s: S.tot }, { v: kpis[2][1], s: S.tot }, { v: soma('baixas'), s: S.tot }, { v: kpis[4][1], s: S.tot }] });
    R.push({ ht: 14, cells: [] }, { ht: 22, cells: [{ v: 'Temas / ocorrências do ano', s: S.sec }] }, { ht: 30, cells: ['Tema / ocorrência', 'Notificações', 'Avisos', 'Multas', 'Baixas', 'Em aberto'].map(v => ({ v, s: S.cab })) });
    const pt = new Map();
    ocAno.forEach(g => {
        const k = ocKey(g.nome);
        if (!pt.has(k))
            pt.set(k, { nome: g.nome, gs: [] });
        pt.get(k).gs.push(g);
    });
    const temas = [...pt.values()].sort((a, b) => b.gs.length - a.gs.length || a.nome.localeCompare(b.nome, 'pt-BR'));
    const T0 = R.length + 1;
    temas.forEach(({ nome, gs }, i) => {
        const z = i % 2, its = gs.flatMap(g => g.itens);
        R.push({ ht: nome.length > 38 ? 32 : 19, cells: [{ v: nome, s: S.c(z, { h: 'left', font: { b: 1 }, wrap: 1 }) }, { v: gs.length, s: S.c(z, { font: { b: 1 } }) }, { v: its.filter(n => !ehMulta(n.etapa)).length, s: S.c(z) }, { v: its.filter(n => ehMulta(n.etapa)).length, s: S.c(z, { font: { cor: VERM } }) }, { v: gs.filter(g => !g.aberta).length, s: S.c(z) }, { v: gs.filter(g => g.aberta).length, s: S.c(z) }] });
    });
    const T1 = R.length;
    const NR = 'Relatório', q = `'${NR}'`, rng = c => `${q}!$${c}$${L0}:$${c}$${L1}`, cats = { ref: rng('A'), valores: nomesM };
    const g1 = XL.grafico({ titulo: `Notificações novas e baixas por mês — ${ano}`, cats, series: [{ nome: 'Notificações novas', ref: rng('B'), cor: VERM, valores: dados.map(x => x.novas) }, { nome: 'Baixas', ref: rng('E'), cor: CINZA, valores: dados.map(x => x.baixas) }] });
    const g2 = XL.grafico({ titulo: `Avisos e multas por mês — ${ano}`, cats, series: [{ nome: 'Avisos', ref: rng('C'), cor: PRETO, valores: dados.map(x => x.avisos - x.multas) }, { nome: 'Multas', ref: rng('D'), cor: VERM, valores: dados.map(x => x.multas) }] });
    const top = temas.slice(0, 8);
    const g3 = top.length ? XL.grafico({ titulo: `Temas com mais notificações — ${ano}`, tipo: 'bar', cats: { ref: `${q}!$A$${T0}:$A$${T0 + top.length - 1}`, valores: top.map(t => t.nome) }, series: [{ nome: 'Notificações', ref: `${q}!$B$${T0}:$B$${T0 + top.length - 1}`, cor: AZUL, valores: top.map(t => t.gs.length) }] }) : null;
    const mescl = ['A1:L1', 'A2:L2', 'A3:L3', ...[0, 2, 4, 6, 8, 10].flatMap(c => [`${XL.col(c)}6:${XL.col(c + 1)}6`, `${XL.col(c)}7:${XL.col(c + 1)}7`])];
    const graficos = [{ xml: g1, de: [7, 8], ate: [13, 26] }, { xml: g2, de: [7, 27], ate: [13, 45] }];
    if (g3)
        graficos.push({ xml: g3, de: [7, 46], ate: [13, Math.max(64, 46 + top.length * 2 + 8)] });
    const aba1 = { nome: NR, xml: XL.planilha({ linhas: R, larguras: [34, 14, 12, 12, 11, 13, 4, 12, 12, 12, 12, 12], mesclas: mescl, paisagem: false, rodape: `${EMPRESA} — Relatório ${ano}`, desenho: true }), graficos };
    /* aba de consulta com filtros (Tabela do Excel) */
    const colD = ['Mês', 'Nº Loja', 'Loja', 'Tema / Ocorrência', 'Nº do aviso', 'Etapa', 'Tipo', 'Encaminhamento', 'Vencimento', 'Situação'];
    const D = [{ ht: 28, cells: colD.map(v => ({ v, s: S.cab })) }];
    avAno.sort((a, b) => (a.data_encaminhamento || '').localeCompare(b.data_encaminhamento || '') || ordemHist(a, b)).forEach(n => {
        const l = lojaDe(n);
        D.push({ cells: [{ v: NOMES_MES[+(n.data_encaminhamento || '0000-01').slice(5, 7) - 1], s: S.n }, { v: String(l.numero), s: S.n }, { v: l.nome, s: S.txt }, { v: (n.infracao || '').trim(), s: S.txt }, { v: n.numero_notificacao || '', s: S.n }, { v: ETAPAS[n.etapa] || '', s: S.n }, { v: ehMulta(n.etapa) ? 'Multa' : 'Aviso', s: S.n }, { v: XL.data(n.data_encaminhamento), s: S.d }, { v: XL.data(n.data_vencimento), s: S.d }, { v: situacao(n).label, s: S.n }] });
    });
    const abas = [aba1];
    if (avAno.length)
        abas.push({ nome: 'Consultar (filtros)', xml: XL.planilha({ linhas: D, larguras: [12, 9, 28, 36, 13, 15, 9, 15, 13, 24], congelar: 1, rodape: `${EMPRESA} — ${ano}`, tabela: true }), tabela: { nome: `Consulta${ano}`, ref: `A1:${XL.col(colD.length - 1)}${D.length}`, colunas: colD }, titulos: 1 });
    baixarArquivo(XL.livro(abas, E), `relatorio-notificacoes-${ano}.xlsx`);
    toast(`Relatório ${ano} gerado.`);
}

/* ================= EXCEL DO ANO INTEIRO (com gráficos) ================= */
function exportarAno(ano) {
    const base = ocorrencias().lista;
    const E = XL.estilos(), st = o => E.st(o), agora = new Date();
    const VERM = 'C8102E', AZUL = '2F6FB3', PRETO = '141414', CINZA = '7A7A7A', BORDA = 'D9D9D9';
    const S = { titulo: st({ font: { b: 1, sz: 18, cor: VERM } }), sub: st({ font: { b: 1, sz: 12, cor: PRETO } }), info: st({ font: { i: 1, sz: 9, cor: '6B6B6B' } }), faixa: st({ fill: VERM }),
        cab: st({ font: { b: 1, sz: 10, cor: 'FFFFFF' }, fill: PRETO, borda: '404040', h: 'center', wrap: 1 }), tot: st({ font: { b: 1, sz: 10, cor: 'FFFFFF' }, fill: VERM, borda: '404040', h: 'center' }),
        totL: st({ font: { b: 1, sz: 10, cor: 'FFFFFF' }, fill: VERM, borda: '404040', h: 'left' }),
        c: (z, o = {}) => st({ font: { sz: 10, ...(o.font || {}) }, fill: o.fill || (z ? 'F5F5F5' : null), borda: BORDA, h: o.h || 'center', data: o.data, wrap: o.wrap }),
        d: st({ font: { sz: 10 }, data: 1, h: 'center' }), n: st({ font: { sz: 10 }, h: 'center' }), txt: st({ font: { sz: 10 } }) };
    const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
    const nomesM = meses.map(m => nomeMes(m).split(' ')[0]);
    const topo = (t, n) => [{ ht: 30, cells: [{ v: EMPRESA.toUpperCase(), s: S.titulo }] }, { ht: 20, cells: [{ v: t, s: S.sub }] },
        { ht: 16, cells: [{ v: `Gerado em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, s: S.info }] },
        { ht: 5, cells: Array.from({ length: n }, () => ({ v: '', s: S.faixa })) }, { ht: 8, cells: [] }];
    /* ---- Resumo do ano: 1 tabela com todos os meses + gráficos ---- */
    const cols = ['Mês', 'Lojas notificadas', 'Notificações novas', 'Avisos emitidos', 'Multas aplicadas', 'Baixas no mês', 'Total do mês'];
    const R = [...topo(`Resumo do ano de ${ano} — todos os meses`, cols.length), { ht: 32, cells: cols.map(v => ({ v, s: S.cab })) }];
    const L0 = R.length + 1; // primeira linha de dados (1-based)
    const dados = meses.map(m => metricasMes(base, m));
    dados.forEach((x, i) => {
        const z = i % 2;
        R.push({ ht: 20, cells: [{ v: nomesM[i], s: S.c(z, { h: 'left', font: { b: 1 } }) }, { v: x.lojas, s: S.c(z) }, { v: x.novas, s: S.c(z, { font: { b: 1 } }) }, { v: x.avisos, s: S.c(z) }, { v: x.multas, s: S.c(z, { font: { cor: VERM } }) }, { v: x.baixas, s: S.c(z) }, { v: x.total, s: S.c(z) }] });
    });
    const L1 = R.length;
    const avAno = [];
    base.forEach(g => g.itens.forEach(n => {
        if ((n.data_encaminhamento || '').slice(0, 4) === ano)
            avAno.push(n);
    }));
    const soma = k => dados.reduce((s, x) => s + x[k], 0);
    R.push({ ht: 22, cells: [{ v: `TOTAL ${ano}`, s: S.totL }, { v: new Set(avAno.map(n => n.loja_id)).size, s: S.tot }, { v: soma('novas'), s: S.tot }, { v: soma('avisos'), s: S.tot }, { v: soma('multas'), s: S.tot }, { v: soma('baixas'), s: S.tot }, { v: '—', s: S.tot }] });
    R.push({ ht: 16, cells: [{ v: '“Lojas notificadas” no total = lojas diferentes notificadas no ano. “Total do mês” = notificações do mês + pendentes de meses anteriores (por isso não se soma).', s: S.info }] });
    const NA = 'Resumo do ano', q = `'${NA}'`, rng = c => `${q}!$${c}$${L0}:$${c}$${L1}`;
    const cats = { ref: rng('A'), valores: nomesM };
    const serie = (col, nome, cor, k) => ({ nome, ref: rng(col), cor, valores: dados.map(x => x[k]) });
    const g1 = XL.grafico({ titulo: `Notificações novas x Baixas — ${ano}`, cats, series: [serie('C', 'Notificações novas', VERM, 'novas'), serie('F', 'Baixas no mês', CINZA, 'baixas')] });
    const g2 = XL.grafico({ titulo: `Lojas notificadas por mês — ${ano}`, cats, series: [serie('B', 'Lojas notificadas', AZUL, 'lojas')] });
    const g3 = XL.grafico({ titulo: `Avisos emitidos x Multas — ${ano}`, cats, series: [serie('D', 'Avisos emitidos', PRETO, 'avisos'), serie('E', 'Multas aplicadas', VERM, 'multas')] });
    const iniG = L1 + 3;
    /* temas do ano (para o gráfico de temas) */
    const pt = new Map();
    base.forEach(g => {
        if ((g.inicio || '').slice(0, 4) !== ano)
            return;
        const k = ocKey(g.nome);
        if (!pt.has(k))
            pt.set(k, { nome: g.nome, gs: [] });
        pt.get(k).gs.push(g);
    });
    const temas = [...pt.values()].sort((a, b) => b.gs.length - a.gs.length || a.nome.localeCompare(b.nome, 'pt-BR'));
    const abaResumo = { nome: NA, xml: XL.planilha({ linhas: R, larguras: [16, 15, 15, 15, 15, 15, 14], mesclas: ['A1:G1', 'A2:G2', 'A3:G3', `A${L1 + 2}:G${L1 + 2}`], paisagem: true, rodape: `${EMPRESA} — Resumo ${ano}`, desenho: true }),
        graficos: [{ xml: g1, de: [8, 1], ate: [17, 19] }, { xml: g2, de: [0, iniG], ate: [7, iniG + 18] }, { xml: g3, de: [8, 20], ate: [17, 38] }] };
    /* ---- Temas x mês ---- */
    const cT = ['Tema / Ocorrência', ...nomesM.map(n => n.slice(0, 3)), 'Total'];
    const T = [...topo(`Notificações novas por tema e por mês — ${ano}`, cT.length), { ht: 28, cells: cT.map(v => ({ v, s: S.cab })) }];
    const T0 = T.length + 1;
    temas.forEach(({ nome, gs }, i) => {
        const z = i % 2, vs = meses.map(m => gs.filter(g => g.inicio.slice(0, 7) === m).length);
        T.push({ ht: 20, cells: [{ v: nome, s: S.c(z, { h: 'left', font: { b: 1 }, wrap: 1 }) }, ...vs.map(v => ({ v: v || '', s: S.c(z) })), { v: gs.length, s: S.c(z, { font: { b: 1 } }) }] });
    });
    const T1 = T.length;
    const tm = meses.map(m => base.filter(g => (g.inicio || '').slice(0, 7) === m).length);
    T.push({ ht: 22, cells: [{ v: 'TOTAL', s: S.totL }, ...tm.map(v => ({ v, s: S.tot })), { v: tm.reduce((a, b) => a + b, 0), s: S.tot }] });
    const top = temas.slice(0, 10), NT = 'Temas no ano';
    const gT = top.length ? XL.grafico({ titulo: `Temas com mais notificações — ${ano}`, tipo: 'bar', cats: { ref: `'${NT}'!$A$${T0}:$A$${T0 + top.length - 1}`, valores: top.map(t => t.nome) }, series: [{ nome: 'Notificações', ref: `'${NT}'!$N$${T0}:$N$${T0 + top.length - 1}`, cor: VERM, valores: top.map(t => t.gs.length) }] }) : null;
    const abaTemas = { nome: NT, xml: XL.planilha({ linhas: T, larguras: [40, ...meses.map(() => 7), 9], mesclas: ['A1:N1', 'A2:N2', 'A3:N3'], congelar: 6, filtro: temas.length ? `A6:N${T1}` : null, rodape: `${EMPRESA} — Temas ${ano}`, desenho: !!gT }), filtro: temas.length ? `A6:N${T1}` : null, titulos: 6,
        graficos: gT ? [{ xml: gT, de: [15, 1], ate: [25, Math.max(22, top.length * 2 + 6)] }] : [] };
    /* ---- Lojas x mês ---- */
    const cLj = ['Nº Loja', 'Loja', ...nomesM.map(n => n.slice(0, 3)), 'Notificações', 'Avisos', 'Multas', 'Baixas'];
    const LJ = [...topo(`Notificações novas por loja e por mês — ${ano}`, cLj.length), { ht: 28, cells: cLj.map(v => ({ v, s: S.cab })) }];
    const pl = new Map();
    base.forEach(g => {
        const noAno = (g.inicio || '').slice(0, 4) === ano || g.itens.some(n => (n.data_encaminhamento || '').slice(0, 4) === ano);
        if (!noAno)
            return;
        if (!pl.has(g.loja_id))
            pl.set(g.loja_id, []);
        pl.get(g.loja_id).push(g);
    });
    [...pl.values()].map(gs => ({ l: lojaDe(gs[0].atual), gs })).sort((a, b) => String(a.l.numero).localeCompare(String(b.l.numero), 'pt-BR', { numeric: true })).forEach(({ l, gs }, i) => {
        const z = i % 2;
        const its = gs.flatMap(g => g.itens).filter(n => (n.data_encaminhamento || '').slice(0, 4) === ano);
        const vs = meses.map(m => gs.filter(g => (g.inicio || '').slice(0, 7) === m).length);
        LJ.push({ ht: 20, cells: [{ v: String(l.numero), s: S.c(z) }, { v: l.nome, s: S.c(z, { h: 'left', font: { b: 1 } }) }, ...vs.map(v => ({ v: v || '', s: S.c(z) })), { v: vs.reduce((a, b) => a + b, 0), s: S.c(z, { font: { b: 1 } }) }, { v: its.length, s: S.c(z) }, { v: its.filter(n => ehMulta(n.etapa)).length, s: S.c(z, { font: { cor: VERM } }) }, { v: gs.filter(g => g.atual.baixada && (g.atual.data_baixa || '').slice(0, 4) === ano).length, s: S.c(z) }] });
    });
    const LJ1 = LJ.length, uL = XL.col(cLj.length - 1);
    const abaLojas = { nome: 'Lojas no ano', xml: XL.planilha({ linhas: LJ, larguras: [9, 28, ...meses.map(() => 7), 13, 9, 9, 9], mesclas: [`A1:${uL}1`, `A2:${uL}2`, `A3:${uL}3`], congelar: 6, filtro: `A6:${uL}${LJ1}`, rodape: `${EMPRESA} — Lojas ${ano}` }), filtro: `A6:${uL}${LJ1}`, titulos: 6 };
    /* ---- Base do ano (todas as informações numa tabela única) ---- */
    const colA = ['Mês', 'Nº do mês', 'Nº Loja', 'Loja', 'Tema / Ocorrência', 'Nº do aviso', 'Etapa', 'Tipo', 'Data de encaminhamento', 'Prazo (dias)', 'Vencimento', 'Situação', 'Baixada', 'Data da baixa', 'Observações', 'Avisos'];
    const linA = [{ ht: 28, cells: colA.map(v => ({ v, s: S.cab })) }];
    avAno.sort((a, b) => (a.data_encaminhamento || '').localeCompare(b.data_encaminhamento || '') || ordemHist(a, b)).forEach(n => {
        const l = lojaDe(n), m = (n.data_encaminhamento || '').slice(0, 7);
        linA.push({ cells: [{ v: nomeMes(m).split(' ')[0], s: S.n }, { v: +m.slice(5, 7), s: S.n }, { v: String(l.numero), s: S.n }, { v: l.nome, s: S.txt }, { v: (n.infracao || '').trim(), s: S.txt }, { v: n.numero_notificacao || '', s: S.n }, { v: ETAPAS[n.etapa] || '', s: S.n }, { v: ehMulta(n.etapa) ? 'Multa' : 'Aviso', s: S.n }, { v: XL.data(n.data_encaminhamento), s: S.d }, { v: Number(n.prazo_dias) || 0, s: S.n }, { v: XL.data(n.data_vencimento), s: S.d }, { v: situacao(n).label, s: S.n }, { v: n.baixada ? 'Sim' : 'Não', s: S.n }, { v: n.baixada ? XL.data(n.data_baixa) : '', s: S.d }, { v: n.observacoes || '', s: S.txt }, { v: 1, s: S.n }] });
    });
    const abas = [abaResumo, abaTemas, abaLojas];
    if (avAno.length)
        abas.push({ nome: `Base ${ano}`, xml: XL.planilha({ linhas: linA, larguras: [11, 9, 9, 28, 34, 13, 15, 9, 16, 10, 13, 22, 9, 13, 40, 9], congelar: 1, rodape: `${EMPRESA} — Base ${ano}`, tabela: true }), tabela: { nome: `Avisos${ano}`, ref: `A1:${XL.col(colA.length - 1)}${linA.length}`, colunas: colA }, titulos: 1 });
    baixarArquivo(XL.livro(abas, E), `notificacoes-ano-${ano}-${hoje()}.xlsx`);
    toast(`Excel do ano ${ano} gerado.`);
}

/* ================= EXCEL PARA ANÁLISE ================= */
function exportarAnalise() {
    const base = ocorrencias().lista;
    if (!base.length)
        return toast('Não há notificações para exportar.', 'bad');
    const E = XL.estilos(), st = o => E.st(o), agora = new Date(), h = hoje();
    const VERM = 'C8102E', PRETO = '141414', BORDA = 'D9D9D9';
    const S = { titulo: st({ font: { b: 1, sz: 18, cor: VERM } }), sub: st({ font: { b: 1, sz: 12, cor: PRETO } }), info: st({ font: { i: 1, sz: 9, cor: '6B6B6B' } }), faixa: st({ fill: VERM }),
        cab: st({ font: { b: 1, sz: 10, cor: 'FFFFFF' }, fill: PRETO, borda: '404040', h: 'center', wrap: 1 }), txt: st({ font: { sz: 10 } }), txtB: st({ font: { sz: 10, b: 1 } }),
        c: (z, o = {}) => st({ font: { sz: 10, ...(o.font || {}) }, fill: o.fill || (z ? 'F5F5F5' : null), borda: BORDA, h: o.h || 'center', data: o.data, pct: o.pct, wrap: o.wrap }),
        d: st({ font: { sz: 10 }, data: 1, h: 'center' }), n: st({ font: { sz: 10 }, h: 'center' }) };
    const topo = (t, n) => [{ ht: 30, cells: [{ v: EMPRESA.toUpperCase(), s: S.titulo }] }, { ht: 20, cells: [{ v: t, s: S.sub }] },
        { ht: 16, cells: [{ v: `Gerado em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, s: S.info }] },
        { ht: 5, cells: Array.from({ length: n }, () => ({ v: '', s: S.faixa })) }];
    const situOc = g => !g.aberta ? 'Encerrada (baixa)' : g.vencida ? 'Vencida' : 'Em aberto no prazo';
    const nomeMesX = m => m ? nomeMes(m) : '';
    /* ---- tabela: uma linha por notificação (ocorrência) ---- */
    const colN = ['Mês de início', 'Ano', 'Nº Loja', 'Loja', 'Tema / Ocorrência', 'Data de início', 'Aviso atual', 'Nº do aviso atual', 'Vencimento atual', 'Situação', 'Qtd. de avisos', 'Teve multa', 'Qtd. de multas', 'Data da baixa', 'Mês da baixa', 'Notificações'];
    const linN = [{ ht: 28, cells: colN.map(v => ({ v, s: S.cab })) }];
    [...base].sort((a, b) => (a.inicio || '').localeCompare(b.inicio || '') || ordemHist(a.atual, b.atual)).forEach(g => {
        const l = lojaDe(g.atual), mul = g.itens.filter(n => ehMulta(n.etapa)).length, mi = (g.inicio || '').slice(0, 7), mb = g.atual.baixada ? (g.atual.data_baixa || '').slice(0, 7) : '';
        linN.push({ cells: [{ v: mi, s: S.n }, { v: +mi.slice(0, 4) || '', s: S.n }, { v: String(l.numero), s: S.n }, { v: l.nome, s: S.txt }, { v: g.nome, s: S.txt }, { v: XL.data(g.inicio), s: S.d }, { v: ETAPAS[g.atual.etapa] || '', s: S.n }, { v: g.atual.numero_notificacao || '', s: S.n }, { v: XL.data(g.atual.data_vencimento), s: S.d }, { v: situOc(g), s: S.n }, { v: g.itens.length, s: S.n }, { v: mul ? 'Sim' : 'Não', s: S.n }, { v: mul, s: S.n }, { v: g.atual.baixada ? XL.data(g.atual.data_baixa) : '', s: S.d }, { v: mb, s: S.n }, { v: 1, s: S.n }] });
    });
    const refN = `A1:${XL.col(colN.length - 1)}${linN.length}`;
    /* ---- tabela: uma linha por aviso ---- */
    const colA = ['Mês', 'Ano', 'Nº Loja', 'Loja', 'Tema / Ocorrência', 'Nº do aviso', 'Etapa', 'Tipo', 'Data de encaminhamento', 'Prazo (dias)', 'Vencimento', 'Situação', 'Baixada', 'Data da baixa', 'Observações', 'Avisos'];
    const linA = [{ ht: 28, cells: colA.map(v => ({ v, s: S.cab })) }];
    const avisos = [];
    base.forEach(g => g.itens.forEach(n => avisos.push(n)));
    avisos.sort((a, b) => (a.data_encaminhamento || '').localeCompare(b.data_encaminhamento || '') || ordemHist(a, b)).forEach(n => {
        const l = lojaDe(n), m = (n.data_encaminhamento || '').slice(0, 7);
        linA.push({ cells: [{ v: m, s: S.n }, { v: +m.slice(0, 4) || '', s: S.n }, { v: String(l.numero), s: S.n }, { v: l.nome, s: S.txt }, { v: (n.infracao || '').trim(), s: S.txt }, { v: n.numero_notificacao || '', s: S.n }, { v: ETAPAS[n.etapa] || '', s: S.n }, { v: ehMulta(n.etapa) ? 'Multa' : 'Aviso', s: S.n }, { v: XL.data(n.data_encaminhamento), s: S.d }, { v: Number(n.prazo_dias) || 0, s: S.n }, { v: XL.data(n.data_vencimento), s: S.d }, { v: situacao(n).label, s: S.n }, { v: n.baixada ? 'Sim' : 'Não', s: S.n }, { v: n.baixada ? XL.data(n.data_baixa) : '', s: S.d }, { v: n.observacoes || '', s: S.txt }, { v: 1, s: S.n }] });
    });
    const refA = `A1:${XL.col(colA.length - 1)}${linA.length}`;
    /* ---- Por mês ---- */
    const primeiro = [...base.flatMap(g => g.itens.map(n => (n.data_encaminhamento || '').slice(0, 7)))].filter(Boolean).sort()[0] || h.slice(0, 7);
    const meses = [];
    for (let m = h.slice(0, 7);; m = mesAnt(m)) {
        meses.unshift(m);
        if (m <= primeiro || meses.length >= 120)
            break;
    }
    const cM = ['Mês', 'Lojas notificadas', 'Notificações novas', 'Avisos emitidos', 'Multas aplicadas', 'Baixas', 'Em aberto no fim do mês', 'Vencidas no fim do mês', 'Total do mês', 'Variação de notificações novas'];
    const lM = [...topo('Evolução mês a mês', cM.length), { ht: 10, cells: [] }, { ht: 32, cells: cM.map(v => ({ v, s: S.cab })) }];
    let antNovas = null;
    meses.forEach((m, i) => {
        const x = metricasMes(base, m), z = i % 2;
        const vari = antNovas ? (x.novas - antNovas) / antNovas : null;
        lM.push({ ht: 20, cells: [{ v: nomeMes(m), s: S.c(z, { h: 'left', font: { b: 1 } }) }, { v: x.lojas, s: S.c(z) }, { v: x.novas, s: S.c(z, { font: { b: 1 } }) }, { v: x.avisos, s: S.c(z) }, { v: x.multas, s: S.c(z, { font: { cor: VERM } }) }, { v: x.baixas, s: S.c(z) }, { v: x.abertas, s: S.c(z) }, { v: x.vencidas, s: S.c(z, { font: { cor: VERM } }) }, { v: x.total, s: S.c(z) }, { v: vari === null ? '—' : vari, s: S.c(z, { pct: 1 }) }] });
        antNovas = x.novas;
    });
    const fimM = lM.length;
    /* ---- Por loja ---- */
    const cL = ['Nº Loja', 'Loja', 'Notificações', 'Em aberto', 'Vencidas', 'Baixas', 'Com multa', 'Avisos emitidos', 'Multas aplicadas', 'Primeira notificação', 'Última notificação'];
    const lL = [...topo('Resumo por loja', cL.length), { ht: 10, cells: [] }, { ht: 32, cells: cL.map(v => ({ v, s: S.cab })) }];
    const pl = new Map();
    base.forEach(g => {
        if (!pl.has(g.loja_id))
            pl.set(g.loja_id, []);
        pl.get(g.loja_id).push(g);
    });
    [...pl.values()].map(gs => ({ l: lojaDe(gs[0].atual), gs })).sort((a, b) => String(a.l.numero).localeCompare(String(b.l.numero), 'pt-BR', { numeric: true })).forEach(({ l, gs }, i) => {
        const z = i % 2, its = gs.flatMap(g => g.itens), ini = gs.map(g => g.inicio).filter(Boolean).sort();
        lL.push({ ht: 20, cells: [{ v: String(l.numero), s: S.c(z) }, { v: l.nome, s: S.c(z, { h: 'left', font: { b: 1 } }) }, { v: gs.length, s: S.c(z, { font: { b: 1 } }) }, { v: gs.filter(g => g.aberta).length, s: S.c(z) }, { v: gs.filter(g => g.vencida).length, s: S.c(z, { font: { cor: VERM } }) }, { v: gs.filter(g => !g.aberta).length, s: S.c(z) }, { v: gs.filter(g => g.itens.some(n => ehMulta(n.etapa))).length, s: S.c(z) }, { v: its.length, s: S.c(z) }, { v: its.filter(n => ehMulta(n.etapa)).length, s: S.c(z, { font: { cor: VERM } }) }, { v: XL.data(ini[0]), s: S.c(z, { data: 1 }) }, { v: XL.data(ini[ini.length - 1]), s: S.c(z, { data: 1 }) }] });
    });
    const fimL = lL.length;
    /* ---- Por tema ---- */
    const cT = ['Tema / Ocorrência', 'Notificações', 'Lojas diferentes', 'Em aberto', 'Vencidas', 'Baixas', 'Com multa', 'Avisos emitidos'];
    const lT = [...topo('Resumo por tema / ocorrência', cT.length), { ht: 10, cells: [] }, { ht: 32, cells: cT.map(v => ({ v, s: S.cab })) }];
    const pt = new Map();
    base.forEach(g => {
        const k = ocKey(g.nome);
        if (!pt.has(k))
            pt.set(k, { nome: g.nome, gs: [] });
        pt.get(k).gs.push(g);
    });
    const temasOrd = [...pt.values()].sort((a, b) => b.gs.length - a.gs.length || a.nome.localeCompare(b.nome, 'pt-BR'));
    temasOrd.forEach(({ nome, gs }, i) => {
        const z = i % 2;
        lT.push({ ht: 20, cells: [{ v: nome, s: S.c(z, { h: 'left', font: { b: 1 }, wrap: 1 }) }, { v: gs.length, s: S.c(z, { font: { b: 1 } }) }, { v: new Set(gs.map(g => g.loja_id)).size, s: S.c(z) }, { v: gs.filter(g => g.aberta).length, s: S.c(z) }, { v: gs.filter(g => g.vencida).length, s: S.c(z, { font: { cor: VERM } }) }, { v: gs.filter(g => !g.aberta).length, s: S.c(z) }, { v: gs.filter(g => g.itens.some(n => ehMulta(n.etapa))).length, s: S.c(z) }, { v: gs.reduce((s, g) => s + g.itens.length, 0), s: S.c(z) }] });
    });
    const fimT = lT.length;
    /* ---- Tema x Mês (notificações novas) ---- */
    const ult = meses.slice(-12), cX = ['Tema / Ocorrência', ...ult.map(mesCurto), 'Total'];
    const lX = [...topo('Notificações novas por tema e por mês (últimos 12 meses)', cX.length), { ht: 10, cells: [] }, { ht: 28, cells: cX.map(v => ({ v, s: S.cab })) }];
    temasOrd.forEach(({ nome, gs }, i) => {
        const z = i % 2, vs = ult.map(m => gs.filter(g => (g.inicio || '').slice(0, 7) === m).length);
        lX.push({ ht: 20, cells: [{ v: nome, s: S.c(z, { h: 'left', font: { b: 1 } }) }, ...vs.map(v => ({ v: v || '', s: S.c(z) })), { v: vs.reduce((a, b) => a + b, 0), s: S.c(z, { font: { b: 1 } }) }] });
    });
    const totM = ult.map(m => base.filter(g => (g.inicio || '').slice(0, 7) === m).length);
    lX.push({ ht: 22, cells: [{ v: 'TOTAL', s: S.cab }, ...totM.map(v => ({ v, s: S.cab })), { v: totM.reduce((a, b) => a + b, 0), s: S.cab }] });
    /* ---- Leia-me ---- */
    const guia = [...topo('Dados para análise — como usar este arquivo', 2), { ht: 10, cells: [] },
        ...[['Aba', 'O que tem'], ['Por mês', 'Evolução mês a mês: lojas notificadas, notificações novas, avisos, multas, baixas, em aberto e vencidas.'], ['Por loja', 'Resumo de cada loja (ordem pelo número da loja).'], ['Por tema', 'Resumo de cada tema / ocorrência, do mais frequente para o menos frequente.'], ['Tema x Mês', 'Quantas notificações novas de cada tema em cada mês (últimos 12 meses).'], ['Base Notificações', 'Tabela com 1 linha por notificação (ocorrência). Coluna “Notificações” = 1 para somar.'], ['Base Avisos', 'Tabela com 1 linha por aviso/multa emitido. Coluna “Avisos” = 1 para somar.'],
            ['', ''], ['Tabela dinâmica', 'Clique em qualquer célula da aba “Base Notificações” (ou “Base Avisos”) → menu Inserir → Tabela Dinâmica → OK.'], ['', 'Depois arraste, por exemplo: “Mês de início” para Linhas, “Tema / Ocorrência” para Colunas e “Notificações” para Valores.'], ['Filtros', 'As abas “Base” já estão formatadas como Tabela do Excel: use as setas do cabeçalho para filtrar por mês, loja, tema, situação etc.'], ['Regra', '1 ocorrência = 1 notificação. 2º/3º aviso e multas são etapas da mesma notificação (contados em “Avisos”).']]
            .map((r, i) => ({ ht: i ? 30 : 22, cells: [{ v: r[0], s: i ? S.txtB : S.cab }, { v: r[1], s: i ? st({ font: { sz: 10 }, wrap: 1 }) : S.cab }] }))];
    const abas = [
        { nome: 'Leia-me', xml: XL.planilha({ linhas: guia, larguras: [22, 110], mesclas: ['A1:B1', 'A2:B2', 'A3:B3'], paisagem: false, rodape: `${EMPRESA} — Análise` }) },
        { nome: 'Por mês', xml: XL.planilha({ linhas: lM, larguras: [22, 14, 14, 13, 13, 11, 15, 15, 12, 16], mesclas: ['A1:J1', 'A2:J2', 'A3:J3'], congelar: 6, filtro: `A6:J${fimM}`, rodape: `${EMPRESA} — Por mês` }), filtro: `A6:J${fimM}`, titulos: 6 },
        { nome: 'Por loja', xml: XL.planilha({ linhas: lL, larguras: [9, 30, 13, 11, 11, 10, 11, 13, 13, 15, 15], mesclas: ['A1:K1', 'A2:K2', 'A3:K3'], congelar: 6, filtro: `A6:K${fimL}`, rodape: `${EMPRESA} — Por loja` }), filtro: `A6:K${fimL}`, titulos: 6 },
        { nome: 'Por tema', xml: XL.planilha({ linhas: lT, larguras: [40, 13, 13, 11, 11, 10, 11, 13], mesclas: ['A1:H1', 'A2:H2', 'A3:H3'], congelar: 6, filtro: `A6:H${fimT}`, rodape: `${EMPRESA} — Por tema` }), filtro: `A6:H${fimT}`, titulos: 6 },
        { nome: 'Tema x Mês', xml: XL.planilha({ linhas: lX, larguras: [40, ...ult.map(() => 9), 10], mesclas: [`A1:${XL.col(cX.length - 1)}1`, `A2:${XL.col(cX.length - 1)}2`, `A3:${XL.col(cX.length - 1)}3`], congelar: 6, rodape: `${EMPRESA} — Tema x Mês` }), titulos: 6 },
        { nome: 'Base Notificações', xml: XL.planilha({ linhas: linN, larguras: [12, 7, 9, 28, 34, 13, 14, 14, 14, 18, 11, 10, 11, 13, 12, 12], congelar: 1, rodape: `${EMPRESA} — Base de notificações`, tabela: true }), tabela: { nome: 'Notificacoes', ref: refN, colunas: colN }, titulos: 1 },
        { nome: 'Base Avisos', xml: XL.planilha({ linhas: linA, larguras: [10, 7, 9, 28, 34, 13, 15, 9, 16, 10, 13, 20, 9, 13, 40, 9], congelar: 1, rodape: `${EMPRESA} — Base de avisos`, tabela: true }), tabela: { nome: 'Avisos', ref: refA, colunas: colA }, titulos: 1 },
    ];
    baixarArquivo(XL.livro(abas, E), `analise-notificacoes-${h}.xlsx`);
    toast('Excel para análise gerado.');
}
