# -*- coding: utf-8 -*-
"""
rotas.py — classe Handler: respostas, sessão do usuário e roteamento de cada endereço
"""
from .api_usuarios import *
from .api_dados import ApiDados
from .api_pdfs import ApiPdfs
from .api_importacao import ApiImportacao

class Handler(ApiUsuarios, ApiDados, ApiPdfs, ApiImportacao, BaseHTTPRequestHandler):
    """Recebe cada pedido do navegador e chama a rota certa."""
    server_version = 'Notificacoes/1.0'
    protocol_version = 'HTTP/1.1'
    timeout = 60          # encerra conexões paradas (evita travar o servidor)

    def log_message(self, fmt, *args):  # silencioso (só erros aparecem no console)
        pass

    # ---- respostas
    def responder(self, status, corpo, tipo='application/json; charset=utf-8', extra=None):
        if isinstance(corpo, (dict, list)): corpo = json.dumps(corpo, ensure_ascii=False).encode('utf-8')
        elif isinstance(corpo, str): corpo = corpo.encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(len(corpo)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        for k, v in (extra or {}).items(): self.send_header(k, v)
        self.end_headers()
        if self.command != 'HEAD': self.wfile.write(corpo)

    def enviar_arquivo(self, caminho_arq, tipo, nome_download=None, inline=True):
        tam = os.path.getsize(caminho_arq)
        self.send_response(200)
        self.send_header('Content-Type', tipo)
        self.send_header('Content-Length', str(tam))
        self.send_header('Cache-Control', 'no-store')
        if nome_download:
            self.send_header('Content-Disposition', f"{'inline' if inline else 'attachment'}; filename*=UTF-8''{quote(nome_download)}")
        self.end_headers()
        with open(caminho_arq, 'rb') as f: shutil.copyfileobj(f, self.wfile)

    def ler_corpo(self, limite=MAX_CORPO):
        n = int(self.headers.get('Content-Length') or 0)
        if n > limite: raise Erro(413, 'Arquivo grande demais.')
        return self.rfile.read(n) if n else b''
    def ler_json(self, limite=MAX_CORPO):
        b = self.ler_corpo(limite)
        try: return json.loads(b.decode('utf-8') or '{}')
        except Exception: raise Erro(400, 'Dados inválidos.')

    TIPOS_ESTATICOS = {'.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8'}

    def enviar_estatico(self, p):
        """Envia os arquivos de estilo (css/) e de programa (js/) da pasta static."""
        pasta = os.path.join(BASE, 'static')
        arq = os.path.normpath(os.path.join(pasta, unquote(p).lstrip('/')))
        tipo = self.TIPOS_ESTATICOS.get(os.path.splitext(arq)[1].lower())
        if not tipo or not arq.startswith(pasta + os.sep) or not os.path.isfile(arq):
            raise Erro(404, 'Arquivo não encontrado.')
        with open(arq, 'rb') as f:
            return self.responder(200, f.read(), tipo)

    # ---- sessão
    def token(self):
        for parte in (self.headers.get('Cookie') or '').split(';'):
            k, _, v = parte.strip().partition('=')
            if k == 'sessao': return v
        return None
    def usuario(self, obrigatorio=True):
        t = self.token()
        if t:
            with conectar() as c:
                # o banco guarda só o "resumo" (hash) do token; sessões antigas (token puro) continuam valendo
                r = c.execute('SELECT u.* FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token IN (?,?) AND s.expira>? AND u.ativo=1',
                              (hash_token(t), t, time.time())).fetchone()
                if r: return r
        if obrigatorio: raise Erro(401, 'Faça login para continuar.')
        return None

    # ---- roteamento
    def do_HEAD(self): self.do_GET()
    def do_GET(self):    self.rotear('GET')
    def do_POST(self):   self.rotear('POST')
    def do_PUT(self):    self.rotear('PUT')
    def do_DELETE(self): self.rotear('DELETE')

    def rotear(self, metodo):
        try:
            url = urlparse(self.path); p = url.path.rstrip('/') or '/'
            q = parse_qs(url.query)
            if metodo in ('GET', 'HEAD') and p in ('/', '/index.html'):
                return self.responder(200, pagina_inicial(), 'text/html; charset=utf-8')
            if metodo in ('GET', 'HEAD') and p in ('/icone.ico', '/favicon.ico') and os.path.isfile(ARQ_ICONE):
                with open(ARQ_ICONE, 'rb') as f: return self.responder(200, f.read(), 'image/x-icon')
            if metodo in ('GET', 'HEAD') and (p.startswith('/css/') or p.startswith('/js/')):
                return self.enviar_estatico(p)
            if p == '/api/login' and metodo == 'POST': return self.api_login()
            if p == '/api/logout' and metodo == 'POST': return self.api_logout()
            u = self.usuario()
            if u['trocar_senha'] and p not in ('/api/eu', '/api/senha'):
                raise Erro(403, 'Troque a sua senha antes de continuar.')
            if p == '/api/eu' and metodo == 'GET':
                return self.responder(200, {'login': u['login'], 'nome': u['nome'], 'cargo': u['cargo'] or '', 'trocar_senha': bool(u['trocar_senha'])})
            if p == '/api/senha' and metodo == 'POST': return self.api_senha(u)
            if p == '/api/versao' and metodo == 'GET':
                with conectar() as c: return self.responder(200, {'versao': int(meta_get(c, 'versao', '0'))})
            if p == '/api/dados' and metodo == 'GET': return self.api_dados()
            if p == '/api/auditoria' and metodo == 'GET': return self.api_auditoria(q)
            if p == '/api/backup/info' and metodo == 'GET': return self.api_backup_info()
            if p == '/api/backup' and metodo == 'GET': return self.api_backup_download(u)
            if p == '/api/importar' and metodo == 'POST': return self.api_importar(u)
            if p == '/api/lojas' and metodo == 'POST': return self.api_salvar_loja(u, None)
            m = ROTA_LOJA.match(p)
            if m:
                if metodo == 'PUT': return self.api_salvar_loja(u, m.group(1))
                if metodo == 'DELETE': return self.api_excluir_loja(u, m.group(1))
            if p == '/api/notificacoes' and metodo == 'POST': return self.api_salvar_notif(u, None)
            m = ROTA_NOTIF_PDF.match(p)
            if m:
                if metodo in ('GET', 'HEAD'): return self.api_pdf_get(m.group(1))
                if metodo == 'PUT': return self.api_pdf_put(u, m.group(1))
                if metodo == 'DELETE': return self.api_pdf_delete(u, m.group(1))
            m = ROTA_NOTIF_PDFS.match(p)
            if m and metodo == 'POST': return self.api_pdf_add(u, m.group(1))
            m = ROTA_NOTIF_PDF_X.match(p)
            if m:
                if metodo in ('GET', 'HEAD'): return self.api_pdf_extra_get(m.group(1), m.group(2))
                if metodo == 'DELETE': return self.api_pdf_extra_delete(u, m.group(1), m.group(2))
            m = ROTA_NOTIF.match(p)
            if m:
                if metodo == 'PUT': return self.api_salvar_notif(u, m.group(1))
                if metodo == 'DELETE': return self.api_excluir_notif(u, m.group(1))
            raise Erro(404, 'Endereço não encontrado.')
        except Erro as e:
            self.responder(e.status, {'erro': e.msg})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception:
            log('ERRO inesperado:\n' + traceback.format_exc())
            try: self.responder(500, {'erro': 'Erro interno no servidor. Veja a janela do servidor.'})
            except Exception: pass
