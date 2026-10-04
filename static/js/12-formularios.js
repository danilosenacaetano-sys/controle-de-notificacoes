/*
 * 12-formularios.js
 * Janelas de cadastro e edição: loja, notificação, baixa e confirmações.
 */

/* =====================================================================
   MODAIS
   ===================================================================== */
/* Confirmação própria do sistema (substitui o confirm() do navegador, que pode ser
   bloqueado pelo Chrome/Edge e fazer os botões de excluir "não funcionarem") */
function confirmar(msg, { titulo = 'Confirmar', ok = 'Confirmar', perigo = false } = {}) {
    return new Promise(res => {
        const root = document.getElementById('confirmRoot');
        root.innerHTML = `<div class="overlay" id="cfOv"><div class="sheet confirm-box" role="alertdialog" aria-modal="true">
      <div class="ic">${perigo ? '🗑' : '?'}</div><h2 style="border:0;padding:0">${esc(titulo)}</h2><p>${esc(msg)}</p>
      <div class="row"><button class="btn secondary" id="cfNo">Cancelar</button><button class="btn ${perigo ? 'danger' : ''}" id="cfOk">${esc(ok)}</button></div></div></div>`;
        const fim = v => {
            root.innerHTML = '';
            document.removeEventListener('keydown', tecla, true);
            res(v);
        };
        const tecla = e => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                fim(false);
            }
        };
        document.addEventListener('keydown', tecla, true);
        document.getElementById('cfNo').onclick = () => fim(false);
        document.getElementById('cfOk').onclick = () => fim(true);
        document.getElementById('cfOv').onclick = e => {
            if (e.target.id === 'cfOv')
                fim(false);
        };
        setTimeout(() => document.getElementById('cfOk')?.focus(), 30);
    });
}

function modal(html, cls = '') {
    document.getElementById('modalRoot').innerHTML = `<div class="overlay" id="ov"><div class="sheet ${cls}">${html}</div></div>`;
    document.getElementById('ov').onclick = e => {
        if (e.target.id === 'ov')
            closeModal();
    };
    document.getElementById('cancel')?.addEventListener('click', closeModal);
    setTimeout(() => document.querySelector('.sheet input:not([type=hidden]), .sheet select')?.focus(), 30);
}

function closeModal() {
    document.getElementById('modalRoot').innerHTML = '';
    if (typeof liberarPdfUrl === 'function')
        liberarPdfUrl();
}

const $v = id => document.getElementById(id).value.trim();
const MAIUSC = s => (s || '').trim().toUpperCase();

function openLojaForm(id) {
    const l = id ? store.lojas.find(x => x.id === id) : null;
    modal(`<h2>${l ? 'Editar' : 'Adicionar'} Loja</h2>
    <label>Número da loja</label><input id="mNumero" class="maiusc" placeholder="159" value="${esc(l?.numero || '')}">
    <label>Nome da loja</label><input id="mNome" class="maiusc" placeholder="BURGER KING" value="${esc(l?.nome || '')}">
    <p class="sub">O nome e o número são salvos automaticamente em LETRAS MAIÚSCULAS.</p>
    <div class="row" style="margin-top:14px">${l ? '<button class="btn danger" id="del">Excluir loja</button>' : '<span></span>'}
    <div class="acoes" style="margin:0"><button class="btn secondary" id="cancel">Cancelar</button><button class="btn" id="save">Salvar</button></div></div>`);
    document.getElementById('save').onclick = async (e) => {
        const numero = MAIUSC($v('mNumero')), nome = MAIUSC($v('mNome'));
        if (!numero || !nome)
            return toast('Preencha número e nome.', 'bad');
        const existente = store.lojas.find(x => x.id !== id && String(x.numero).toUpperCase() === numero);
        if (existente) {
            if (l)
                return toast(`O número ${numero} já pertence à loja ${existente.nome}.`, 'bad'); // edição: não pode repetir número
            const abertas = abertasDaLoja(existente.id).length;
            closeModal();
            state.tab = 'manut';
            state.loja = existente.id;
            state.oc = null;
            state.qLoja = '';
            render();
            window.scrollTo(0, 0);
            if (abertas) {
                // CENÁRIO 1: loja já está em Manutenção (tem notificação em aberto) → não duplica
                toast(`A loja ${existente.numero} — ${existente.nome} já está em Manutenção, com ${abertas} notificação(ões) em aberto.`, 'bad');
            }
            else {
                // CENÁRIO 2: loja já cadastrada, sem notificação em aberto → reutiliza o cadastro e abre a nova notificação
                toast(`Loja ${existente.numero} — ${existente.nome} já cadastrada: usando o cadastro existente. Registre a nova notificação.`);
                openNotifForm();
            }
            return;
        }
        e.target.disabled = true;
        const r = await executar(() => l ? api('PUT', `/api/lojas/${l.id}`, { numero, nome }) : api('POST', '/api/lojas', { numero, nome }), 'Loja salva.');
        if (r) {
            closeModal();
            if (!l) {
                state.tab = 'manut';
                state.loja = r.id;
                state.oc = null;
                render();
                openNotifForm();
            }
        }
        else
            e.target.disabled = false;
    };
    if (l)
        document.getElementById('del').onclick = () => excluirLoja(l.id);
}

async function excluirLoja(id) {
    const l = store.lojas.find(x => x.id === id);
    if (!l)
        return;
    const qt = ocsDaLoja(id).length;
    const msg = `Excluir a loja ${l.numero} — ${l.nome}?` + (qt ? `\n\nEla e as ${qt} notificação(ões) dela deixarão de aparecer no sistema (continuam guardadas no banco e nos backups).` : '') +
        `\n\nAtenção: se a loja apenas não tem advertências em aberto, NÃO é preciso excluir — ela sai da Manutenção sozinha e continua cadastrada.`;
    if (!await confirmar(msg, { titulo: 'Excluir loja', ok: 'Excluir loja', perigo: true }))
        return;
    if (await executar(() => api('DELETE', `/api/lojas/${id}`), 'Loja excluída.')) {
        if (state.dash.loja === id)
            state.dash.loja = '';
        state.loja = null;
        closeModal();
        render();
    }
}

/* Formulário: nova notificação (nova ocorrência), edição de um aviso ou emissão do próximo aviso (origem) */
function openNotifForm({ id = null, origemId = null, tipo = 'aviso', avulsa = false } = {}) {
    const n = id ? notifPorId(id) : null, orig = origemId ? notifPorId(origemId) : null;
    if (n?.avulsa)
        avulsa = true;
    const lojaId = n?.loja_id || orig?.loja_id || state.loja;
    const l = avulsa ? { id: '', numero: n?.numero_loja || '', nome: n?.nome_loja || '' } : store.lojas.find(x => x.id === lojaId);
    const etapa = n?.etapa || (orig ? proximaEtapa(ocDe(orig), tipo) : '1');
    const titulo = avulsa ? (n ? 'Editar notificação avulsa' : 'Inserir notificação (somente em Vencimentos)') : n ? `Editar ${ETAPAS[n.etapa]}` : orig ? `Emitir ${ETAPAS[etapa]} — mesma notificação` : 'Nova notificação (nova ocorrência)';
    modal(`<h2>${esc(titulo)}</h2>${avulsa ? `<p class="aviso-info">Esta notificação aparece <b>somente em Vencimentos</b>. Ela não entra na Manutenção, no Dashboard nem no histórico da loja.</p>
    <div class="grid2"><div><label>Número da loja</label><input id="nLojaNum" class="maiusc" value="${esc(l.numero)}" placeholder="123"></div><div><label>Nome da loja</label><input id="nLojaNome" class="maiusc" value="${esc(l.nome)}" placeholder="BURGER KING"></div></div>` : `<p class="sub">Loja ${esc(l.numero)} — ${esc(l.nome)}</p>`}
    ${orig ? `<p class="aviso-info">Este é um novo <b>aviso</b> da notificação <b>${esc(orig.infracao)}</b> — não é uma nova notificação. O ${ETAPAS[orig.etapa]} (Nº ${esc(orig.numero_notificacao)}) fica guardado no histórico e, em Vencimentos, passa a aparecer somente este novo aviso.</p>` : ''}
    ${!n && !orig && !avulsa ? '<p class="aviso-info">Use esta opção somente para uma <b>infração nova</b>. Para 2º/3º aviso ou multa de uma notificação que já existe, abra a notificação e clique em “Emitir próximo aviso”.</p>' : ''}
    <label>Infração / ocorrência</label><input id="nInfracao" class="maiusc" placeholder="VAZAMENTO DE ÁGUA" value="${esc(n?.infracao || orig?.infracao || '')}" list="listaInfracoes" ${orig ? 'readonly' : ''}>
    <datalist id="listaInfracoes">${[...new Set(store.notificacoes.map(x => (x.infracao || '').trim()))].map(x => `<option value="${esc(x)}">`).join('')}</datalist>
    <div class="grid2"><div><label>Nº do aviso (NNN/AAAA)</label><input id="nNumero" value="${esc(n?.numero_notificacao || sugerirNumero())}"></div>
    <div><label>Aviso</label><select id="nEtapa">${opcoesEtapa(etapa).map(([k, v]) => `<option value="${k}" ${k === etapa ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
    <div class="grid2"><div><label>Data de encaminhamento</label><input type="date" id="nData" value="${n?.data_encaminhamento || hoje()}"></div>
    <div><label>Prazo (dias corridos)</label><input type="number" id="nPrazo" value="${n?.prazo_dias || orig?.prazo_dias || 5}" min="0"></div></div>
    <p class="sub" id="nVencPrev"></p>
    <label>Observações</label><textarea id="nObs" placeholder="Detalhes, contato, local exato...">${esc(n?.observacoes || '')}</textarea>
    <label>Documentos PDF digitalizados (opcional — pode escolher vários de uma vez, sem limite)</label>
    ${n && pdfsDe(n).length ? `<div class="pdf-lista"><span class="sub">PDFs já anexados (${pdfsDe(n).length}) — ficam guardados; marque só se quiser remover algum:</span>${pdfsDe(n).map((p, i) => `<label class="check"><input type="checkbox" class="nPdfDel" value="${esc(p.id)}"> Remover “PDF ${i + 1}${p.nome && p.nome !== 'PDF' ? ` · ${esc(p.nome)}` : ''}” <a href="${urlPdf(n.id, p)}" target="_blank" rel="noopener">(ver)</a></label>`).join('')}</div>` : ''}
    <input type="file" id="nPdf" accept="application/pdf" multiple><p class="sub" id="nPdfInfo" style="margin:4px 0 0">${n && pdfsDe(n).length ? 'Os PDFs escolhidos aqui são <b>adicionados</b> aos que já existem.' : ''}</p>
    <div class="row" style="margin-top:14px">${n ? '<button class="btn danger" id="delN">🗑 Excluir aviso</button>' : '<span></span>'}<div class="acoes" style="margin:0"><button class="btn secondary" id="cancel">Cancelar</button><button class="btn" id="save">Salvar</button></div></div>`);
    if (n)
        document.getElementById('delN').onclick = async () => {
            if (await ACOES.delNotif(n.id))
                closeModal();
        };
    const prev = () => {
        const d = $v('nData'), p = $v('nPrazo');
        document.getElementById('nVencPrev').textContent = d && p !== '' ? `Vencimento: ${fmtDate(addDias(d, p))}` : '';
    };
    ['nData', 'nPrazo'].forEach(x => document.getElementById(x).addEventListener('input', prev));
    prev();
    document.getElementById('save').onclick = async (e) => {
        const infracao = MAIUSC($v('nInfracao')), numero_notificacao = $v('nNumero'), et = $v('nEtapa'), data_encaminhamento = $v('nData'), prazoStr = $v('nPrazo');
        if (!infracao || !numero_notificacao || !data_encaminhamento || prazoStr === '')
            return toast('Preencha infração, número, data e prazo.', 'bad');
        if (store.notificacoes.some(x => x.id !== id && x.numero_notificacao.trim() === numero_notificacao) && !await confirmar(`Já existe um aviso com o número ${numero_notificacao}.`, { titulo: 'Número repetido', ok: 'Salvar mesmo assim' }))
            return;
        const files = [...document.getElementById('nPdf').files], remover = [...document.querySelectorAll('.nPdfDel:checked')].map(x => x.value);
        if (files.some(f => f.size > 50 * 1024 * 1024))
            return toast('Um dos PDFs tem mais de 50 MB. Digitalize com resolução menor.', 'bad');
        if (remover.length && !await confirmar(`Remover ${plural(remover.length, 'PDF', 'PDFs')} desta notificação?\n\nO arquivo continua guardado no servidor (pasta pdfs/_removidos).`, { titulo: 'Remover PDF', ok: 'Remover' }))
            return;
        e.target.disabled = true;
        e.target.textContent = 'Salvando…';
        const prazo_dias = Number(prazoStr);
        if (avulsa && (!MAIUSC($v('nLojaNum')) || !MAIUSC($v('nLojaNome'))))
            return toast('Preencha o número e o nome da loja.', 'bad');
        const corpo = { ...(n || {}), loja_id: l.id, infracao, numero_notificacao, etapa: et, data_encaminhamento, prazo_dias,
            data_vencimento: addDias(data_encaminhamento, prazo_dias), observacoes: $v('nObs') };
        if (!n) {
            corpo.baixada = false;
            corpo.origem_id = orig?.id || null;
        }
        if (avulsa) {
            corpo.avulsa = true;
            corpo.loja_id = '';
            corpo.numero_loja = MAIUSC($v('nLojaNum'));
            corpo.nome_loja = MAIUSC($v('nLojaNome'));
        }
        delete corpo.id;
        delete corpo.tem_pdf;
        delete corpo.pdfs;
        const salvo = await executar(async () => {
            const r = n ? await api('PUT', `/api/notificacoes/${n.id}`, corpo) : await api('POST', '/api/notificacoes', corpo);
            for (const pid of remover)
                await api('DELETE', pid === 'principal' ? `/api/notificacoes/${r.id}/pdf` : `/api/notificacoes/${r.id}/pdfs/${pid}`);
            for (const f of files)
                await api('POST', `/api/notificacoes/${r.id}/pdfs`, f);
            return r;
        }, files.length > 1 ? `Salvo com ${files.length} PDFs.` : 'Salvo.');
        if (salvo) {
            closeModal();
            if (!avulsa && state.tab === 'manut' && state.loja) {
                const g = ocDe(notifPorId(salvo.id));
                state.oc = g ? g.id : null;
                render();
            }
        }
        else {
            e.target.disabled = false;
            e.target.textContent = 'Salvar';
        }
    };
}

function openBaixa(id) {
    const n = notifPorId(id), g = ocDe(n);
    modal(`<h2>Dar baixa na notificação</h2><p class="sub">${esc(g?.nome || n.infracao)} · aviso atual: ${ETAPAS[n.etapa]} Nº ${esc(n.numero_notificacao)}</p>
    <p class="aviso-info">A notificação será <b>encerrada</b> e sairá de Vencimentos. Todos os avisos continuam guardados no histórico.</p>
    <label>Motivo</label><select id="bMotivo">${Object.entries(MOTIVOS).filter(([k]) => k !== 'reiterada').map(([k, v]) => `<option value="${k}" ${k === (ehMulta(n.etapa) ? 'multa' : 'regularizada') ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <label>Data da baixa</label><input type="date" id="bData" value="${hoje()}">
    <label>Observação (opcional)</label><textarea id="bObs" placeholder="Ex.: loja regularizou, vistoria feita por..."></textarea>
    <div class="row" style="margin-top:14px"><button class="btn secondary" id="cancel">Cancelar</button><button class="btn" id="save">Confirmar baixa</button></div>`);
    document.getElementById('save').onclick = async (e) => {
        const data_baixa = $v('bData') || hoje(), obs = $v('bObs');
        const corpo = { ...n, baixada: true, motivo_baixa: $v('bMotivo'), data_baixa,
            observacoes: obs ? (n.observacoes ? n.observacoes + '\n' : '') + `[Baixa ${fmtDate(data_baixa)}] ${obs}` : n.observacoes };
        delete corpo.id;
        delete corpo.tem_pdf;
        delete corpo.pdfs;
        e.target.disabled = true;
        if (await executar(() => api('PUT', `/api/notificacoes/${n.id}`, corpo), 'Baixa registrada.'))
            closeModal();
        else
            e.target.disabled = false;
    };
}

/* com vários PDFs abre a janela grande (lá dá para escolher cada um); com um só, abre direto */
function abrirPDF(id) {
    const n = notifPorId(id), ps = pdfsDe(n);
    if (ps.length > 1)
        return abrirDetalhe(id);
    window.open(ps.length ? urlPdf(id, ps[0]) : `/api/notificacoes/${id}/pdf`, '_blank');
}
