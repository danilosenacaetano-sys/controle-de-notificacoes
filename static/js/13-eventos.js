/*
 * 13-eventos.js
 * Cliques, digitação e ações dos botões (um único "ouvinte" para a página toda).
 */

/* =====================================================================
   EVENTOS (delegação — um listener só para toda a página)
   ===================================================================== */
const ACOES = {
    ir: id => irPara(id),
    addLoja: () => openLojaForm(),
    delLoja: id => excluirLoja(id),
    dashOrdem: id => {
        state.dash.ordem = id;
        render();
    },
    dashLoja: id => {
        state.dash.loja = id || '';
        state.dash.busca = '';
        render();
    },
    editLoja: id => openLojaForm(id),
    abrirLoja: (id, el) => {
        state.tab = 'manut';
        state.loja = id;
        state.oc = el && el.dataset.oc || null;
        render();
        window.scrollTo(0, 0);
    },
    voltar: () => {
        state.loja = null;
        state.oc = null;
        render();
    },
    ocorr: id => {
        state.oc = id;
        render();
        window.scrollTo(0, 0);
    },
    ocVoltar: () => {
        state.oc = null;
        render();
    },
    addNotif: () => openNotifForm(),
    editNotif: id => openNotifForm({ id }),
    /* REABRIR: a notificação volta a ficar pendente (não cria outra); a baixa anterior fica registrada na própria notificação */
    reabrir: async (id) => {
        const n = notifPorId(id);
        if (!n || !n.baixada)
            return;
        if (!await confirmar('Você tem certeza que deseja reabrir a notificação já baixada?', { titulo: 'Reabrir notificação', ok: 'Sim, reabrir' }))
            return;
        const corpo = { ...n };
        delete corpo.id;
        delete corpo.tem_pdf;
        delete corpo.pdfs;
        const reg = { reaberta_em: hoje(), por: usuarioAtual?.nome || '', baixa_anterior: n.data_baixa || '', motivo_anterior: n.motivo_baixa || '' };
        corpo.reaberturas = [...(n.reaberturas || []), reg];
        corpo.observacoes = (n.observacoes ? n.observacoes + '\n' : '') + `[Reaberta em ${fmtDate(reg.reaberta_em)} por ${reg.por}${reg.baixa_anterior ? ` — baixa anterior de ${fmtDate(reg.baixa_anterior)}` : ''}]`;
        corpo.baixada = false;
        delete corpo.data_baixa;
        delete corpo.motivo_baixa;
        const detAberto = !!document.querySelector('#modalRoot .det');
        if (await executar(() => api('PUT', `/api/notificacoes/${id}`, corpo), 'Notificação reaberta.')) {
            if (detAberto) {
                closeModal();
                abrirDetalhe(id);
            }
        }
    },
    proxima: id => openNotifForm({ origemId: id }),
    proximaMulta: id => openNotifForm({ origemId: id, tipo: 'multa' }),
    inserirAvulsa: () => openNotifForm({ avulsa: true }),
    baixar: id => openBaixa(id),
    delNotif: async (id) => {
        const n = notifPorId(id);
        if (!n)
            return false;
        if (!await confirmar(`${ETAPAS[n.etapa]} Nº ${n.numero_notificacao} — ${n.infracao}\n\nSomente este aviso deixará de aparecer (ele continua guardado no banco e nos backups).`, { titulo: 'Excluir aviso', ok: 'Excluir aviso', perigo: true }))
            return false;
        return !!(await executar(() => api('DELETE', `/api/notificacoes/${id}`), 'Aviso excluído.'));
    },
    pdf: id => abrirPDF(id),
    pdfUrl: (id, el) => window.open(el.dataset.url, '_blank'),
    detPdf: (id, el) => {
        const f = document.querySelector('#detPdf iframe');
        if (f)
            f.src = el.dataset.url + '#view=FitH';
        el.parentNode.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === el));
        const b = document.getElementById('detAbrirPdf');
        if (b)
            b.dataset.url = el.dataset.url;
    },
    seq: id => abrirDetalhe(id),
    det: id => abrirDetalhe(id),
    seqManut: (id, el) => {
        closeModal();
        ACOES.abrirLoja(id, el);
    },
    vencPer: id => {
        state.vencAno = id ? id.slice(0, 4) : '';
        state.vencMes = id ? id.slice(5, 7) : '';
        render();
    },
    vencOrdem: id => {
        state.vencOrdem = id;
        document.getElementById('vencTabela').innerHTML = vencTabelaHTML();
    },
    vencFiltro: id => {
        state.venc = id;
        document.getElementById('vencTabela').innerHTML = vencTabelaHTML();
    },
    limparDash: () => {
        state.dash = { ...state.dash, mes: hoje().slice(0, 7), loja: '', busca: '', consBusca: '' };
        render();
    },
    dashMes: id => {
        state.dash.mes = id;
        render();
    },
    dashCons: id => {
        state.dash.cons = id;
        const r = document.getElementById('dConsRes');
        if (r)
            r.innerHTML = dashConsultaRes();
    },
    dashConsVer: id => {
        state.dash.consVer = id;
        render();
    },
    dashLojaFiltro: id => {
        state.dash.lojaFiltro = id;
        const r = document.getElementById('kpiRes');
        if (r)
            r.innerHTML = dashKpiRes();
    },
    dashEvo: id => {
        state.dash.evo = id;
        if (state.dash.drill && state.dash.drill.t === 'evo')
            state.dash.drill.k = id;
        render();
    },
    grAtual: () => {
        state.dash.grTabMes = '';
        state.dash.grManual = false;
        state.dash.grBManual = false;
        state.dash.sitMes = '';
        state.dash.drill = null;
        render();
    },
    exportRelatorio: () => exportarRelatorio((state.dash.grA || hoje()).slice(0, 4)),
    grExportTab: () => exportarTabelaGraf(),
    grMes: id => {
        state.dash.grTabMes = '';
        state.dash.drill = null;
        state.pop = null;
        escolherPeriodo('grA', id);
        setTimeout(() => document.getElementById('grTab')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
        return;
        if (state.dash.drill)
            setTimeout(() => document.getElementById('grDrill')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    },
    grSit: id => {
        const d = state.dash.drill;
        state.dash.drill = d && d.t === 'sit' && d.c === id ? null : { t: 'sit', c: id };
        render();
        if (state.dash.drill)
            setTimeout(() => document.getElementById('grDrill')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    },
    grFechar: () => {
        state.dash.drill = null;
        render();
    },
    exportAno: () => exportarAno((state.dash.grA || hoje()).slice(0, 4)),
    exportAnalise: () => exportarAnalise(),
    grAba: id => {
        state.dash.grAba = id;
        render();
    },
    raMes: id => {
        const D = state.dash;
        D.raMes = id && D.raMes === id ? '' : id;
        render();
    },
    raAnoNav: id => {
        const D = state.dash;
        D.raAno = String(+(D.raAno || hoje().slice(0, 4)) + Number(id));
        D.raMes = '';
        D.raSel = null;
        render();
    },
    raSel: (id, el) => {
        const D = state.dash, t = el.dataset.t;
        D.raSel = D.raSel && D.raSel.t === t && D.raSel.id === id ? null : { t, id };
        D.raBusca = '';
        render();
        if (D.raSel)
            setTimeout(() => document.getElementById('raTab')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    },
    raFechar: () => {
        state.dash.raSel = null;
        render();
    },
    raExport: () => {
        const D = state.dash, T = resumoTabela(resumoDados());
        exportarTabelaGraf(T, { ord: D.raOrd, busca: D.raBusca });
    },
    mpAbrir: id => {
        state.pop = state.pop && state.pop.id === id ? null : { id };
        render();
    },
    mpAno: id => {
        const [k, a] = id.split('|');
        if (MP_OPC[k].anoInteiro)
            return escolherPeriodo(k, a);
        state.pop = { id: k, ano: a };
        render();
    },
    mpMes: id => {
        const [k, m] = id.split('|');
        escolherPeriodo(k, m);
    },
    mpTodos: id => escolherPeriodo(id, ''),
    vencTodos: () => escolherPeriodo('venc', ''),
    dashKVer: (id, el) => {
        state.dash.kVer = id;
        el.parentNode.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === el));
        const r = document.getElementById('kpiRes');
        if (r)
            r.innerHTML = dashKpiRes();
    },
    dashKf: id => {
        state.dash.kf = id;
        const r = document.getElementById('kpiRes');
        if (r)
            r.innerHTML = dashKpiRes();
    },
    dashKpi: id => {
        state.dash.kpi = state.dash.kpi === id ? '' : id;
        state.dash.kq = '';
        state.dash.kf = 'todas';
        state.dash.kEtapa = '';
        render();
        if (state.dash.kpi)
            setTimeout(() => document.querySelector('.kpi-lista')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    },
    importar: () => document.getElementById('fileImport').click(),
    csvTudo: () => exportarExcel([...store.notificacoes].sort(ordemHist), `notificacoes-${hoje()}.xlsx`, ''),
    histLoja: id => {
        state.hist.loja = id || '';
        if (!id && state.hist.temaExato) {
            state.hist.tema = '';
            state.hist.temaExato = false;
        }
        render();
        window.scrollTo(0, 0);
    },
    histTemaSel: (id, el) => {
        const H = state.hist;
        H.loja = id;
        H.tema = el.dataset.tema;
        H.temaExato = true;
        render();
        window.scrollTo(0, 0);
    },
    histTema: id => {
        const H = state.hist;
        if (id === '') {
            H.tema = '';
            H.temaExato = false;
        }
        else {
            const t = temasDaLoja(H.loja)[+id];
            if (t) {
                H.tema = t.nome;
                H.temaExato = true;
            }
        }
        render();
    },
    histExcelTema: id => {
        const l = store.lojas.find(x => x.id === id), H = state.hist;
        if (!l || !H.tema.trim())
            return;
        const lista = store.notificacoes.filter(n => n.loja_id === id && temaCasa(n)).sort(ordemHist);
        const tNome = H.tema.trim(), tArq = tNome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40);
        exportarExcel(lista, `notificacoes-loja-${nomeArqLoja(l)}-tema-${tArq}-${hoje()}.xlsx`, `tema “${tNome}”`, `${l.nome} — Loja ${l.numero} — Tema: ${tNome}`, { porTema: true });
    },
    histExcel: id => {
        const l = store.lojas.find(x => x.id === id);
        if (!l)
            return;
        const lista = store.notificacoes.filter(n => n.loja_id === id).sort(ordemHist);
        const arq = `notificacoes-loja-${String(l.numero).replace(/[^\w-]/g, '')}-${l.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}-${hoje()}.xlsx`;
        exportarExcel(lista, arq, '', `${l.nome} — Loja ${l.numero}`, { porTema: true });
    },
    sair: () => sair(),
};

const app = document.getElementById('app');
const clique = e => {
    const el = e.target.closest('[data-act]');
    if (el)
        ACOES[el.dataset.act]?.(el.dataset.id, el, e);
};

app.addEventListener('click', clique);
document.getElementById('modalRoot').addEventListener('click', clique);
document.getElementById('userBox').addEventListener('click', clique);
app.addEventListener('input', e => {
    const t = e.target, H = state.hist;
    if (t.classList.contains('maiusc')) {
        const p = t.selectionStart;
        t.value = t.value.toUpperCase();
        try {
            t.setSelectionRange(p, p);
        }
        catch (_) { }
    }
    if (t.id === 'vBusca') {
        state.vencBusca = t.value;
        document.getElementById('vencTabela').innerHTML = vencTabelaHTML();
    }
    if (t.id === 'raBusca') {
        state.dash.raBusca = t.value;
        const r = document.getElementById('raRes');
        if (r)
            r.innerHTML = resumoTabelaRes();
    }
    if (t.id === 'grBusca') {
        state.dash.grBusca = t.value;
        const r = document.getElementById('grTabRes');
        if (r)
            r.innerHTML = grTabelaRes();
    }
    if (t.id === 'kBusca') {
        state.dash.kq = t.value;
        const r = document.getElementById('kpiRes');
        if (r)
            r.innerHTML = dashKpiRes();
    }
    if (t.id === 'dConsulta') {
        state.dash.consBusca = t.value;
        const r = document.getElementById('dConsRes');
        if (r)
            r.innerHTML = dashConsultaRes();
    }
    if (t.id === 'dBusca') {
        state.dash.busca = t.value;
        document.getElementById('dResultados').innerHTML = dashResultadosHTML();
    }
    if (t.id === 'qLoja') {
        state.qLoja = t.value;
        document.getElementById('listaLojas').innerHTML = listaLojasHTML();
        const ls = document.getElementById('listaLojasSem');
        if (ls) {
            ls.innerHTML = listaLojasHTML(true);
            if (t.value.trim())
                ls.closest('details').open = true;
        }
    }
    const mapa = { hNome: 'nome', hNumero: 'numero', hTema: 'tema' };
    if (t.id === 'hTema')
        H.temaExato = false;
    if (mapa[t.id]) {
        H[mapa[t.id]] = t.value;
        document.getElementById('histRes').innerHTML = histResultados().html;
    }
    if (t.id === 'audQ')
        desenharAuditoria();
});

document.getElementById('modalRoot').addEventListener('input', e => {
    const t = e.target;
    if (t.classList.contains('maiusc')) {
        const p = t.selectionStart;
        t.value = t.value.toUpperCase();
        try {
            t.setSelectionRange(p, p);
        }
        catch (_) { }
    }
});

app.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'fMes') {
        state.dash.mes = t.value;
        render();
    }
    if (t.id === 'grAMes' || t.id === 'grBMes') {
        const D = state.dash, at = hoje().slice(0, 7);
        let v = t.value || at;
        if (v > at)
            v = at;
        if (t.id === 'grAMes') {
            D.grA = v;
            D.grManual = v !== at;
            if (!D.grBManual || D.grB === v)
                D.grB = mesAnt(v);
            D.sitMes = v;
            D.drill = null;
        }
        else {
            D.grB = v;
            D.grBManual = true;
        }
        render();
    }
    if (t.id === 'vMes') {
        const v = t.value || '';
        state.vencAno = v.slice(0, 4);
        state.vencMes = v.slice(5, 7);
        render();
    }
    if (t.id === 'consMostrar') {
        state.dash.cons = t.value;
        const r = document.getElementById('dConsRes');
        if (r)
            r.innerHTML = dashConsultaRes();
    }
    if (t.id === 'vMostrar') {
        state.venc = t.value;
        document.getElementById('vencTabela').innerHTML = vencTabelaHTML();
    }
    if (t.id === 'raOrd') {
        state.dash.raOrd = t.value;
        const r = document.getElementById('raRes');
        if (r)
            r.innerHTML = resumoTabelaRes();
    }
    if (t.id === 'kOrd') {
        state.dash.kOrd = t.value;
        const r = document.getElementById('kpiRes');
        if (r)
            r.innerHTML = dashKpiRes();
    }
    if (t.id === 'consOrd') {
        state.dash.consOrd = t.value;
        const r = document.getElementById('dConsRes');
        if (r)
            r.innerHTML = dashConsultaRes();
    }
    if (t.id === 'grOrd') {
        state.dash.grOrd = t.value;
        const r = document.getElementById('grTabRes');
        if (r)
            r.innerHTML = grTabelaRes();
    }
    if (t.id === 'vOrdem') {
        state.vencOrdem = t.value;
        document.getElementById('vencTabela').innerHTML = vencTabelaHTML();
    }
    if (t.dataset.per && t.dataset.per !== 'venc') {
        const D = state.dash, { ano, mes } = lerSeletor(t.dataset.per), at = hoje().slice(0, 7);
        let v = `${ano}-${mes}`;
        if (v > at)
            v = at;
        if (t.dataset.per === 'grA') {
            D.grA = v;
            D.grManual = v !== at;
            if (!D.grBManual || D.grB === v)
                D.grB = mesAnt(v);
            D.sitMes = v;
            D.drill = null;
        }
        if (t.dataset.per === 'grB') {
            D.grB = v;
            D.grBManual = true;
        }
        if (t.dataset.per === 'sit') {
            D.sitMes = v;
        }
        render();
    }
    if (t.id === 'kEtapa') {
        state.dash.kEtapa = t.value;
        const r = document.getElementById('kpiRes');
        if (r)
            r.innerHTML = dashKpiRes();
    }
    if (t.dataset.per === 'venc') {
        const { ano, mes } = lerSeletor('venc');
        state.vencAno = ano;
        state.vencMes = ano ? mes : '';
        render();
    }
    if (t.id === 'hAno') {
        state.hist.ano = t.value;
        document.getElementById('histRes').innerHTML = histResultados().html;
    }
    if (t.id === 'hEtapa') {
        state.hist.etapa = t.value;
        document.getElementById('histRes').innerHTML = histResultados().html;
    }
    if (t.id === 'hTema') {
        state.hist.tema = t.value;
        if (state.hist.loja)
            render();
        else
            document.getElementById('histRes').innerHTML = histResultados().html;
    }
    if (t.id === 'audUser')
        desenharAuditoria();
    if (t.id === 'fileImport' && t.files[0]) {
        importarArquivo(t.files[0]);
        t.value = '';
    }
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.querySelector('#modalRoot .obrigatorio'))
        closeModal();
    if (e.key === 'Enter' && e.target.id === 'dBusca') {
        const b = document.querySelector('#dResultados [data-act="dashLoja"]');
        if (b)
            b.click();
    }
});

document.querySelector('[data-home]').addEventListener('click', () => {
    if (usuarioAtual)
        irPara('home');
});

document.querySelectorAll('.logo-img').forEach(i => i.src = LOGO);

/* Fundo animado (identidade visual): corredor em perspectiva, fachadas de lojas com vitrines que acendem,
   luzes que sobem devagar e um brilho suave que acompanha o mouse. Fica atrás de tudo, não recebe cliques,
   roda a ~30 quadros/s e pausa quando a janela não está visível. */
(() => {
    const cv = document.createElement('canvas');
    cv.id = 'fundoAnim';
    cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
    const orb = document.createElement('div');
    orb.id = 'fundoOrbs';
    orb.setAttribute('aria-hidden', 'true');
    orb.innerHTML = '<i></i><i></i><i></i>';
    document.body.prepend(orb);
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, lojas = [], luzes = [], mx = -9999, my = -9999, gx = -9999, gy = -9999;
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tam = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = innerWidth;
        H = innerHeight;
        cv.width = W * dpr;
        cv.height = H * dpr;
        cv.style.width = W + 'px';
        cv.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        /* fachadas: uma fileira de lojas no rodapé da tela */
        lojas = [];
        let x = -20;
        while (x < W + 40) {
            const w = 90 + Math.random() * 120, h = 70 + Math.random() * 70;
            lojas.push({ x, w, h, fase: Math.random() * 6.28, vel: .3 + Math.random() * .5, listras: Math.random() < .5 });
            x += w + 14;
        }
        luzes = Array.from({ length: Math.round(Math.min(46, Math.max(18, W / 40))) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + .6, v: .12 + Math.random() * .28, f: Math.random() * 6.28, ox: 0, oy: 0 }));
    };
    tam();
    addEventListener('resize', tam);
    addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
    }, { passive: true });
    addEventListener('mouseout', e => {
        if (!e.relatedTarget) {
            mx = my = -9999;
        }
    });
    let ult = 0, t0 = performance.now();
    const passo = t => {
        requestAnimationFrame(passo);
        if (document.hidden || t - ult < 33)
            return;
        ult = t;
        const tt = (t - t0) / 1000;
        ctx.clearRect(0, 0, W, H);
        const base = H - 2, hz = H * .52, cx = W / 2 + (mx > 0 ? (mx - W / 2) * .04 : 0);
        /* piso do corredor em perspectiva */
        ctx.lineWidth = 1;
        for (let i = -10; i <= 10; i++) {
            const xb = W / 2 + i * W / 9;
            ctx.strokeStyle = 'rgba(200,16,46,.045)';
            ctx.beginPath();
            ctx.moveTo(cx, hz);
            ctx.lineTo(xb, base + 40);
            ctx.stroke();
        }
        for (let k = 1; k < 9; k++) {
            const p = Math.pow(k / 9, 1.8), y = hz + (base - hz) * p + ((tt * 18) % ((base - hz) / 9)) * p;
            if (y > base)
                continue;
            ctx.strokeStyle = `rgba(20,20,20,${.025 + p * .03})`;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
        /* fachada de um centro comercial em traço fino: pórtico, vidro, coberturas curvas e palmeiras */
        {
            const fw = Math.min(980, W * .78), px = W / 2 + (gx > 0 ? (gx - W / 2) * -.015 : 0), chao = base - 6;
            const pw = fw * .30, ph = Math.min(H * .42, fw * .36), topo = chao - ph, esc = ph * .14, aba = fw * .035;
            const L = 'rgba(20,20,20,', R = 'rgba(200,16,46,';
            ctx.lineWidth = 1.2;
            /* alas laterais com cobertura curva */
            for (const lado of [-1, 1]) {
                const x0 = px + lado * pw / 2, x1 = px + lado * fw / 2, hw = ph * .62, yTop = chao - hw;
                ctx.strokeStyle = L + '.08)';
                ctx.beginPath();
                ctx.moveTo(x0, yTop);
                ctx.lineTo(x1, yTop + hw * .10);
                ctx.lineTo(x1, chao);
                ctx.stroke();
                ctx.strokeStyle = L + '.11)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x0, yTop - ph * .08);
                ctx.quadraticCurveTo((x0 + x1) / 2, yTop - ph * .20, x1 + lado * fw * .03, yTop + hw * .04);
                ctx.stroke();
                ctx.lineWidth = 1.2;
                for (let k = 1; k < 5; k++) {
                    const xx = x0 + (x1 - x0) * k / 5;
                    ctx.strokeStyle = L + '.04)';
                    ctx.beginPath();
                    ctx.moveTo(xx, yTop + hw * .02 * k);
                    ctx.lineTo(xx, chao);
                    ctx.stroke();
                }
                /* palmeira */
                const tx = x0 + (x1 - x0) * .55, th = ph * .9;
                ctx.strokeStyle = 'rgba(31,138,76,.10)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(tx, chao);
                ctx.quadraticCurveTo(tx + lado * 8, chao - th * .5, tx + lado * 4, chao - th);
                ctx.stroke();
                const sw = Math.sin(tt * .7 + lado) * .08;
                for (let f = 0; f < 7; f++) {
                    const ang = -Math.PI / 2 + (f - 3) * .45 + sw;
                    ctx.beginPath();
                    ctx.moveTo(tx + lado * 4, chao - th);
                    ctx.quadraticCurveTo(tx + lado * 4 + Math.cos(ang) * th * .22, chao - th + Math.sin(ang) * th * .22 - 10, tx + lado * 4 + Math.cos(ang) * th * .34, chao - th + Math.sin(ang) * th * .34 + 16);
                    ctx.stroke();
                }
                ctx.lineWidth = 1.2;
            }
            /* pórtico (moldura em trapézio, mais larga no alto) */
            ctx.fillStyle = 'rgba(255,255,255,.35)';
            ctx.strokeStyle = L + '.13)';
            ctx.beginPath();
            ctx.moveTo(px - pw / 2 - aba, topo);
            ctx.lineTo(px + pw / 2 + aba, topo);
            ctx.lineTo(px + pw / 2, chao - esc);
            ctx.lineTo(px - pw / 2, chao - esc);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            for (let k = 1; k < 6; k++) {
                const xx = px - pw / 2 - aba + (pw + 2 * aba) * k / 6;
                ctx.strokeStyle = L + '.05)';
                ctx.beginPath();
                ctx.moveTo(xx, topo);
                ctx.lineTo(xx, topo + ph * .16);
                ctx.stroke();
            }
            /* vidro da fachada */
            const gxl = px - pw * .36, gw = pw * .72, gyt = topo + ph * .20, gh = chao - esc - gyt;
            const vg = ctx.createLinearGradient(0, gyt, 0, gyt + gh);
            vg.addColorStop(0, 'rgba(90,150,170,.10)');
            vg.addColorStop(1, 'rgba(90,150,170,.03)');
            ctx.fillStyle = vg;
            ctx.fillRect(gxl, gyt, gw, gh);
            ctx.strokeStyle = L + '.10)';
            ctx.strokeRect(gxl, gyt, gw, gh);
            for (let k = 1; k < 6; k++) {
                ctx.strokeStyle = L + '.045)';
                ctx.beginPath();
                ctx.moveTo(gxl + gw * k / 6, gyt);
                ctx.lineTo(gxl + gw * k / 6, gyt + gh);
                ctx.stroke();
            }
            for (let k = 1; k < 4; k++) {
                ctx.beginPath();
                ctx.moveTo(gxl, gyt + gh * k / 4);
                ctx.lineTo(gxl + gw, gyt + gh * k / 4);
                ctx.stroke();
            }
            /* brilho de luz atravessando o vidro */
            if (!reduz) {
                const ciclo = (tt % 9) / 9, bx = gxl - gw * .4 + ciclo * gw * 1.8;
                ctx.save();
                ctx.beginPath();
                ctx.rect(gxl, gyt, gw, gh);
                ctx.clip();
                const lg = ctx.createLinearGradient(bx - 40, 0, bx + 40, 0);
                lg.addColorStop(0, 'rgba(255,255,255,0)');
                lg.addColorStop(.5, 'rgba(255,255,255,.35)');
                lg.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = lg;
                ctx.beginPath();
                ctx.moveTo(bx - 30, gyt);
                ctx.lineTo(bx + 50, gyt);
                ctx.lineTo(bx + 10, gyt + gh);
                ctx.lineTo(bx - 70, gyt + gh);
                ctx.fill();
                ctx.restore();
            }
            /* escadas e corrimãos */
            for (let k = 0; k < 5; k++) {
                const y = chao - esc + esc * k / 5, ext = k * fw * .012;
                ctx.strokeStyle = L + '.07)';
                ctx.beginPath();
                ctx.moveTo(px - pw / 2 - ext - pw * .15, y);
                ctx.lineTo(px + pw / 2 + ext + pw * .15, y);
                ctx.stroke();
            }
            ctx.strokeStyle = L + '.10)';
            ctx.beginPath();
            ctx.moveTo(0, chao);
            ctx.lineTo(W, chao);
            ctx.stroke();
        }
        /* luzes subindo; perto do mouse elas brilham e se afastam de leve */
        gx += (mx - gx) * .08;
        gy += (my - gy) * .08;
        for (const p of luzes) {
            if (!reduz) {
                p.y -= p.v;
                p.x += Math.sin(tt * .6 + p.f) * .15;
            }
            if (p.y < -10) {
                p.y = H + 10;
                p.x = Math.random() * W;
            }
            const dx = p.x - gx, dy = p.y - gy, d = Math.hypot(dx, dy), perto = d < 140 ? (1 - d / 140) : 0;
            p.ox += ((perto ? dx / d * perto * 26 : 0) - p.ox) * .08;
            p.oy += ((perto ? dy / d * perto * 26 : 0) - p.oy) * .08;
            ctx.fillStyle = `rgba(200,16,46,${.22 + perto * .5})`;
            ctx.beginPath();
            ctx.arc(p.x + p.ox, p.y + p.oy, p.r + perto * 1.6, 0, 6.283);
            ctx.fill();
        }
        /* brilho suave que segue o mouse */
        if (gx > 0) {
            const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 220);
            rg.addColorStop(0, 'rgba(200,16,46,.07)');
            rg.addColorStop(1, 'rgba(200,16,46,0)');
            ctx.fillStyle = rg;
            ctx.fillRect(gx - 220, gy - 220, 440, 440);
        }
    };
    requestAnimationFrame(passo);
})();

let toastTimer;

function toast(msg, tipo = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = tipo;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.className = 'hide', 4000);
}
