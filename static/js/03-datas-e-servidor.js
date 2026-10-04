/*
 * 03-datas-e-servidor.js
 * Funções de data, comunicação com o servidor, login e atualização automática.
 */

/* =====================================================================
   DATAS (sempre no fuso local — evita "virar o dia" às 21h em Brasília)
   ===================================================================== */
const pad = n => String(n).padStart(2, '0');

function isoLocal(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hoje() {
    return isoLocal(new Date());
}

function addDias(iso, dias) {
    const [y, m, d] = iso.split('-').map(Number);
    return isoLocal(new Date(y, m - 1, d + Number(dias)));
}

function diffDias(a, b) {
    const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 864e5);
}

function fmtDate(iso) {
    if (!iso)
        return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function diasTxt(d) {
    const n = Number(d) || 0;
    return `${n} dia${n === 1 ? '' : 's'}`;
}

function esc(s) {
    return (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* =====================================================================
   SERVIDOR — banco de dados centralizado (todos os computadores veem os mesmos dados)
   ===================================================================== */
let store = { lojas: [], notificacoes: [], avulsas: [] };
let versaoDados = 0, usuarioAtual = null, _ocCache = null;

async function api(metodo, url, corpo) {
    const init = { method: metodo, credentials: 'same-origin', headers: {} };
    if (corpo instanceof Blob) {
        init.body = corpo;
        init.headers['Content-Type'] = 'application/pdf';
        if (corpo.name)
            init.headers['X-Nome-Arquivo'] = encodeURIComponent(corpo.name);
    }
    else if (corpo !== undefined) {
        init.body = JSON.stringify(corpo);
        init.headers['Content-Type'] = 'application/json';
    }
    let r;
    try {
        r = await fetch(url, init);
    }
    catch (e) {
        marcarConexao(false);
        throw new Error('Sem conexão com o servidor. Verifique se o computador servidor está ligado e com o sistema aberto.');
    }
    marcarConexao(true);
    let dados = null;
    try {
        if ((r.headers.get('Content-Type') || '').includes('json'))
            dados = await r.json();
    }
    catch (e) { }
    if (r.status === 401 && url !== '/api/login') {
        mostrarLogin();
        throw new Error('Sua sessão expirou. Entre novamente.');
    }
    if (r.status === 403 && dados?.erro?.includes('Troque')) {
        if (!document.getElementById('sNova'))
            pedirTrocaSenha(true);
        throw new Error(dados.erro);
    }
    if (!r.ok)
        throw new Error(dados?.erro || `Erro ${r.status} no servidor.`);
    return dados;
}

async function carregarDados() {
    const d = await api('GET', '/api/dados');
    /* notificações "avulsas" (criadas em Vencimentos → INSERIR NOTIFICAÇÃO) ficam separadas:
       aparecem SOMENTE em Vencimentos e não mexem em nenhuma outra parte do sistema */
    store = { lojas: d.lojas, notificacoes: d.notificacoes.filter(n => !n.avulsa), avulsas: d.notificacoes.filter(n => n.avulsa) };
    versaoDados = d.versao;
    _ocCache = null;
}

/* Executa uma alteração no servidor, recarrega os dados e redesenha a tela */
async function executar(fn, msgOk) {
    try {
        const r = await fn();
        await carregarDados();
        render();
        if (msgOk)
            toast(msgOk);
        return r ?? true;
    }
    catch (e) {
        toast(e.message, 'bad');
        try {
            await carregarDados();
            render();
        }
        catch (_) { }
        return false;
    }
}

function marcarConexao(ok) {
    const el = document.getElementById('conexao');
    if (el)
        el.classList.toggle('hide', ok);
}

/* Atualização automática: se o outro usuário alterar algo, a tela se atualiza sozinha */
async function verificarAtualizacoes() {
    if (!usuarioAtual || usuarioAtual.trocar_senha || document.hidden)
        return;
    try {
        const { versao } = await api('GET', '/api/versao');
        if (versao === versaoDados)
            return;
        const ocupado = document.getElementById('modalRoot').innerHTML || document.getElementById('confirmRoot').innerHTML
            || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
        if (ocupado)
            return; // não atrapalha quem está digitando; atualiza na próxima verificação
        await carregarDados();
        render();
    }
    catch (e) { }
}

/* ---------- login ---------- */
function mostrarLogin(msg) {
    usuarioAtual = null;
    closeModal();
    document.body.classList.add('sem-login');
    document.getElementById('app').innerHTML = `<div class="login-wrap" data-empresa="${esc(EMPRESA)}"><form class="login-card" id="loginForm" autocomplete="off">
    <img src="${LOGO}" alt="${esc(EMPRESA)}">
    <h1>Controle de Notificações</h1><p class="sub">${esc(EMPRESA)} · acesso restrito</p>
    ${msg ? `<p class="login-erro">${esc(msg)}</p>` : ''}
    <label>Usuário</label><input id="lgUser" name="lg-usuario" autocomplete="off" autocapitalize="off" spellcheck="false" required autofocus value="">
    <label>Senha</label><input id="lgSenha" name="lg-senha" type="password" autocomplete="off" required>
    <button class="btn" id="lgBtn" style="width:100%;margin-top:12px;padding:12px">Entrar</button>
    <p class="login-erro hide" id="lgErro"></p>
  </form></div>`;
    document.getElementById('loginForm').onsubmit = async (e) => {
        e.preventDefault();
        const b = document.getElementById('lgBtn');
        b.disabled = true;
        b.textContent = 'Entrando…';
        try {
            const lembrar = false;
            const u = await api('POST', '/api/login', { login: $v('lgUser'), senha: document.getElementById('lgSenha').value, lembrar });
            try {
                if (lembrar)
                    localStorage.setItem('lembrarLogin', '1');
                else
                    localStorage.removeItem('lembrarLogin');
            }
            catch (_) { }
            await entrou(u);
        }
        catch (err) {
            const el = document.getElementById('lgErro');
            el.textContent = err.message;
            el.classList.remove('hide');
            b.disabled = false;
            b.textContent = 'Entrar';
        }
    };
}

async function entrou(u) {
    try {
        sessionStorage.setItem('sessaoAtiva', '1');
    }
    catch (_) { }
    usuarioAtual = u;
    document.body.classList.remove('sem-login');
    document.getElementById('userNome').textContent = u.nome + (u.cargo ? ` · ${u.cargo}` : '');
    if (u.trocar_senha) {
        document.getElementById('app').innerHTML = '';
        pedirTrocaSenha(true);
        return;
    }
    await carregarDados();
    render();
}

function pedirTrocaSenha(obrigatoria = false) {
    modal(`<h2>${obrigatoria ? 'Crie a sua senha' : 'Trocar senha'}</h2>
    ${obrigatoria ? '<p class="sub">Este é o seu primeiro acesso (ou a sua senha foi redefinida). Crie uma senha pessoal — mínimo de 6 caracteres. Não compartilhe com ninguém.</p>' : ''}
    <label>${obrigatoria ? 'Senha que você usou para entrar agora' : 'Senha atual'}</label><input type="password" id="sAtual" autocomplete="current-password">
    <label>Nova senha</label><input type="password" id="sNova" autocomplete="new-password">
    <label>Repita a nova senha</label><input type="password" id="sNova2" autocomplete="new-password">
    <div class="row ${obrigatoria ? 'obrigatorio' : ''}" style="margin-top:14px">${obrigatoria ? '<button class="btn secondary" id="sSair">Sair</button>' : '<button class="btn secondary" id="cancel">Cancelar</button>'}<button class="btn" id="save">Salvar senha</button></div>`);
    if (obrigatoria) {
        document.getElementById('ov').onclick = null;
        document.getElementById('sSair').onclick = sair;
    }
    document.getElementById('save').onclick = async () => {
        const nova = document.getElementById('sNova').value;
        if (nova !== document.getElementById('sNova2').value)
            return toast('As novas senhas não conferem.', 'bad');
        try {
            await api('POST', '/api/senha', { atual: document.getElementById('sAtual').value, nova });
            closeModal();
            toast('Senha salva.');
            if (obrigatoria) {
                usuarioAtual.trocar_senha = false;
                await carregarDados();
                render();
            }
        }
        catch (e) {
            toast(e.message, 'bad');
        }
    };
}

async function sair() {
    try {
        sessionStorage.removeItem('sessaoAtiva');
        localStorage.removeItem('lembrarLogin');
    }
    catch (_) { }
    try {
        await api('POST', '/api/logout');
    }
    catch (e) { }
    mostrarLogin();
}
