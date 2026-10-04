"""
Apoio aos testes: liga um servidor de verdade numa pasta temporária e conversa com ele pela rede,
do mesmo jeito que o navegador faz. Só usa a biblioteca padrão do Python.
"""
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SENHA_PESSOAL = 'Senha-Pessoal-123'


def porta_livre():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


class Cliente:
    """Navegador simplificado: guarda o cookie de sessão e devolve (status, json)."""

    def __init__(self, base):
        self.base, self.cookie = base, ''

    def pedir(self, metodo, caminho, corpo=None, tipo='application/json', extra=None):
        dados = None
        if corpo is not None:
            dados = corpo if isinstance(corpo, bytes) else json.dumps(corpo).encode()
        req = urllib.request.Request(self.base + caminho, data=dados, method=metodo)
        if dados is not None:
            req.add_header('Content-Type', tipo)
        if self.cookie:
            req.add_header('Cookie', self.cookie)
        for k, v in (extra or {}).items():
            req.add_header(k, v)
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                status, bruto, cab = r.status, r.read(), r.headers
        except urllib.error.HTTPError as e:
            status, bruto, cab = e.code, e.read(), e.headers
        m = re.search(r'sessao=([^;]*)', cab.get('Set-Cookie') or '')
        if m:
            self.cookie = f'sessao={m.group(1)}'
        if 'json' in (cab.get('Content-Type') or ''):
            return status, json.loads(bruto or b'null')
        return status, bruto


class ServidorDeTeste(unittest.TestCase):
    """Base dos testes: um servidor novo (banco vazio) para cada classe de teste."""

    @classmethod
    def setUpClass(cls):
        cls.pasta = tempfile.mkdtemp(prefix='teste_')
        cls.porta = porta_livre()
        amb = dict(os.environ, APP_PORTA=str(cls.porta), APP_PASTA_DADOS=os.path.join(cls.pasta, 'dados'),
                   APP_PASTA_BACKUPS=os.path.join(cls.pasta, 'backups'), APP_ABRIR_NAVEGADOR='nao',
                   APP_EMPRESA='Empresa de Teste', APP_CRIAR_ATALHOS='nao', PYTHONIOENCODING='utf-8')
        cls.proc = subprocess.Popen([sys.executable, 'servidor.py'], cwd=RAIZ, env=amb,
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cls.base = f'http://127.0.0.1:{cls.porta}'
        for _ in range(100):
            try:
                urllib.request.urlopen(cls.base + '/icone.ico', timeout=1)
                break
            except Exception:
                time.sleep(.1)
        else:
            raise RuntimeError('o servidor não ligou')

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        cls.proc.wait(10)
        shutil.rmtree(cls.pasta, ignore_errors=True)

    def senha_provisoria(self, rotulo='admin'):
        with open(os.path.join(self.pasta, 'dados', 'PRIMEIRO-ACESSO.txt'), encoding='utf-8-sig') as f:
            texto = f.read()
        if rotulo == 'cadastro':
            return re.search(r'senha do Cadastro de Lojas: (\S+)', texto).group(1)
        return re.search(rf'usuário: {rotulo}\s.*?senha provisória: (\S+)', texto).group(1)

    def entrar(self):
        """Primeiro acesso do admin: entra com a senha provisória e cria a senha pessoal."""
        c = Cliente(self.base)
        st, _ = c.pedir('POST', '/api/login', {'login': 'admin', 'senha': SENHA_PESSOAL})
        if st == 200:
            return c
        st, u = c.pedir('POST', '/api/login', {'login': 'admin', 'senha': self.senha_provisoria()})
        self.assertEqual(st, 200)
        self.assertTrue(u['trocar_senha'])
        st, _ = c.pedir('POST', '/api/senha', {'atual': self.senha_provisoria(), 'nova': SENHA_PESSOAL})
        self.assertEqual(st, 200)
        return c


class TestesComuns:
    """Testes de segurança comuns (misturados na classe de teste)."""

    def test_pagina_inicial_usa_nome_da_empresa(self):
        st, html = Cliente(self.base).pedir('GET', '/')
        self.assertEqual(st, 200)
        self.assertIn('Empresa de Teste', html.decode())
        self.assertNotIn('{{EMPRESA}}', html.decode())

    def test_api_exige_login(self):
        st, _ = Cliente(self.base).pedir('GET', '/api/dados')
        self.assertEqual(st, 401)

    def test_senha_errada_e_bloqueio(self):
        c = Cliente(self.base)
        for _ in range(5):
            st, _ = c.pedir('POST', '/api/login', {'login': 'usuario-inexistente', 'senha': 'x'})
            self.assertEqual(st, 401)
        st, _ = c.pedir('POST', '/api/login', {'login': 'usuario-inexistente', 'senha': 'x'})
        self.assertEqual(st, 429)

    def test_primeiro_acesso_obriga_trocar_senha(self):
        c = Cliente(self.base)
        senha = self.senha_provisoria()
        st, u = c.pedir('POST', '/api/login', {'login': 'admin', 'senha': senha})
        if st == 401:      # outro teste já trocou a senha
            return
        self.assertTrue(u['trocar_senha'])
        st, _ = c.pedir('GET', '/api/dados')
        self.assertEqual(st, 403)

    def test_arquivos_estaticos_nao_saem_da_pasta(self):
        st, _ = Cliente(self.base).pedir('GET', '/js/../../app/banco.py')
        self.assertIn(st, (403, 404))

    def test_backup_completo(self):
        c = self.entrar()
        st, zipado = c.pedir('GET', '/api/backup')
        self.assertEqual(st, 200)
        self.assertEqual(zipado[:2], b'PK')
