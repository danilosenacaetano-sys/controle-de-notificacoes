# -*- coding: utf-8 -*-
"""
http_base.py — rotas da API, servidor HTTP, proteção contra tentativas de senha e erros
"""
from .arquivos import *

ROTA_NOTIF_PDF = re.compile(r'^/api/notificacoes/([\w-]+)/pdf$')
ROTA_NOTIF_PDFS = re.compile(r'^/api/notificacoes/([\w-]+)/pdfs$')
ROTA_NOTIF_PDF_X = re.compile(r'^/api/notificacoes/([\w-]+)/pdfs/(\d+)$')
ROTA_NOTIF     = re.compile(r'^/api/notificacoes/([\w-]+)$')
ROTA_LOJA      = re.compile(r'^/api/lojas/([\w-]+)$')

class Servidor(ThreadingHTTPServer):
    # No Windows, SO_REUSEADDR deixaria dois servidores usarem a mesma porta: por isso fica desligado lá.
    # (Não usamos SO_EXCLUSIVEADDRUSE: ele impede religar o servidor por alguns minutos depois de desligar.)
    allow_reuse_address = (os.name != 'nt')
    daemon_threads = True

def servidor_ja_ligado():
    """True se ESTE sistema já está respondendo na porta (outra cópia do servidor já está ligada)."""
    try:
        import urllib.request
        with urllib.request.urlopen(f'http://127.0.0.1:{PORTA}/icone.ico', timeout=3) as r:
            return r.status == 200
    except Exception:
        return False

def aviso_windows(msg):
    """Mostra uma caixa de mensagem no Windows (funciona mesmo sem janela preta)."""
    log(msg)
    if os.name == 'nt':
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, msg, 'Controle de Notificações', 0x40)
        except Exception: pass

class Limitador:
    """Bloqueia por 15 min depois de 5 senhas erradas seguidas (por computador + usuário)."""
    def __init__(self, max_falhas=5, janela=900):
        self.max, self.janela, self.f, self.t = max_falhas, janela, {}, threading.Lock()
    def bloqueado(self, ip, u):
        with self.t:
            v = [x for x in self.f.get((ip, u), []) if time.time() - x < self.janela]
            self.f[(ip, u)] = v
            return len(v) >= self.max
    def falha(self, ip, u):
        with self.t: self.f.setdefault((ip, u), []).append(time.time())
    def sucesso(self, ip, u):
        with self.t: self.f.pop((ip, u), None)
LIMITADOR = Limitador()

class Erro(Exception):
    def __init__(self, status, msg): super().__init__(msg); self.status = status; self.msg = msg


def pagina_inicial():
    """index.html com o nome da empresa (config.ini) já preenchido."""
    from html import escape
    with open(ARQ_HTML, encoding='utf-8') as f:
        return f.read().replace('{{EMPRESA}}', escape(EMPRESA))
