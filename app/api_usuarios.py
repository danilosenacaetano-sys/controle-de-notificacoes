# -*- coding: utf-8 -*-
"""
api_usuarios.py — login, saída e troca de senha
"""
from .http_base import *

class ApiUsuarios:
    """Rotas de login e sessão (usadas pela classe Handler em rotas.py)."""

    def api_login(self):
        d = self.ler_json()
        login = sem_acento(str(d.get('login', ''))).strip().lower(); senha = str(d.get('senha', ''))
        ip = self.client_address[0]
        if LIMITADOR.bloqueado(ip, login):
            raise Erro(429, 'Muitas tentativas erradas. Aguarde 15 minutos e tente de novo.')
        with conectar() as c:                                   # leitura: não segura a trava das gravações
            u = c.execute('SELECT * FROM usuarios WHERE login=? AND ativo=1', (login,)).fetchone()
        if not u or not secrets.compare_digest(hash_senha(senha, u['salt']), u['senha_hash']):
            LIMITADOR.falha(ip, login); log(f'Tentativa de login recusada: "{login}" a partir de {ip}')
            raise Erro(401, 'Usuário ou senha incorretos.')
        LIMITADOR.sucesso(ip, login)
        with TRAVA, conectar() as c:
            tok = secrets.token_urlsafe(32)
            lembrar = bool(d.get('lembrar'))
            dur = DIAS_LEMBRAR * 86400 if lembrar else 12 * 3600
            c.execute('DELETE FROM sessoes WHERE expira<?', (time.time(),))
            c.execute('INSERT INTO sessoes(token,usuario_id,expira) VALUES(?,?,?)', (hash_token(tok), u['id'], time.time() + dur))
            auditar(c, u['nome'], 'login', 'entrou no sistema')
        self.responder(200, {'login': u['login'], 'nome': u['nome'], 'cargo': u['cargo'] or '', 'trocar_senha': bool(u['trocar_senha'])},
                       extra={'Set-Cookie': f'sessao={tok}; Path=/; HttpOnly; SameSite=Strict' + (f'; Max-Age={dur}' if lembrar else '')})

    def api_logout(self):
        t = self.token()
        if t:
            with TRAVA, conectar() as c: c.execute('DELETE FROM sessoes WHERE token IN (?,?)', (hash_token(t), t))
        self.responder(200, {'ok': True}, extra={'Set-Cookie': 'sessao=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'})

    def api_senha(self, u):
        # a senha só pode ser definida no primeiro acesso (ou depois de redefinida pelo computador servidor)
        if not u['trocar_senha']: raise Erro(403, 'A troca de senha pelo sistema está desativada. Para redefinir, use o arquivo "REDEFINIR SENHA DE UM USUARIO" no computador servidor.')
        d = self.ler_json()
        atual, nova = str(d.get('atual', '')), str(d.get('nova', ''))
        if not secrets.compare_digest(hash_senha(atual, u['salt']), u['senha_hash']): raise Erro(400, 'A senha atual está incorreta.')
        if len(nova) < 6: raise Erro(400, 'A nova senha precisa ter pelo menos 6 caracteres.')
        if nova == atual: raise Erro(400, 'A nova senha precisa ser diferente da atual.')
        with TRAVA, conectar() as c:
            definir_senha(c, u['id'], nova, 0)
            auditar(c, u['nome'], 'senha', 'trocou a própria senha')
        self.responder(200, {'ok': True})
