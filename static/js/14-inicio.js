/*
 * 14-inicio.js
 * Inicialização do sistema ao abrir a página.
 */

/* =====================================================================
   INÍCIO
   ===================================================================== */
(async () => {
    /* Quem marcou "Manter conectado" entra direto (o computador guarda só um código de acesso seguro, nunca a senha).
       Sem essa opção, pede usuário e senha sempre que o sistema é aberto (atualizar com F5 não pede de novo). */
    let aberto = false;
    try {
        aberto = sessionStorage.getItem('sessaoAtiva') === '1' || localStorage.getItem('lembrarLogin') === '1';
    }
    catch (_) { }
    if (!aberto) {
        try {
            await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
        }
        catch (_) { }
    }
    try {
        const u = await api('GET', '/api/eu');
        await entrou(u);
    }
    catch (e) {
        if (!usuarioAtual)
            mostrarLogin(/conexão/.test(e.message) ? e.message + ' Tentando conectar de novo…' : '');
        // se o servidor ainda estava ligando, tenta de novo sozinho e recarrega quando ele responder
        if (/conexão/.test(e.message)) {
            const t = setInterval(async () => {
                try {
                    const r = await fetch('/icone.ico', { cache: 'no-store' });
                    if (r.ok) {
                        clearInterval(t);
                        location.reload();
                    }
                }
                catch (_) { }
            }, 3000);
        }
    }
    setInterval(verificarAtualizacoes, 8000);
    let mesVisto = hoje().slice(0, 7);
    setInterval(() => {
        const m = hoje().slice(0, 7);
        if (m !== mesVisto) {
            mesVisto = m;
            if (usuarioAtual && (state.tab === 'graf' || state.tab === 'venc' || state.tab === 'dash'))
                render();
        }
    }, 60000);
    document.addEventListener('visibilitychange', verificarAtualizacoes);
})();
