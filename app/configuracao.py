# -*- coding: utf-8 -*-
"""
configuracao.py — leitura do config.ini, pastas, constantes e registro (log) do servidor
"""

import os, sys, json, sqlite3, hashlib, secrets, threading, time, datetime, shutil, zipfile, re, base64
import configparser, unicodedata, socket, traceback, getpass, tempfile, subprocess, webbrowser
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote, unquote

for _f in (sys.stdout, sys.stderr):
    try: _f.reconfigure(errors='replace')
    except Exception: pass
# pasta principal do sistema (a pasta acima de app/)
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Configuração: config.ini da instalação ou, se ele não existir, config.exemplo.ini (padrão do repositório).
# Variáveis de ambiente APP_<CHAVE> têm prioridade sobre o arquivo (usadas pelos testes automáticos).
ARQ_CONFIG = next((p for p in (os.environ.get('APP_CONFIG'), os.path.join(BASE, 'config.ini'),
                               os.path.join(BASE, 'config.exemplo.ini')) if p and os.path.isfile(p)), '')
cfg = configparser.ConfigParser(interpolation=None)
cfg.optionxform = str                    # preserva o texto das chaves (logins da seção [usuarios])
if ARQ_CONFIG:
    cfg.read(ARQ_CONFIG, encoding='utf-8-sig')


def C(k, d):
    """Lê uma opção da seção [servidor] (ou da variável de ambiente APP_<OPÇÃO>)."""
    return (os.environ.get('APP_' + k.upper()) or cfg.get('servidor', k, fallback=d)).strip()


def usuarios_config(padrao):
    """Usuários da seção [usuarios] do config.ini, no formato:  login = Nome | Cargo"""
    lista = []
    if cfg.has_section('usuarios'):
        for login, valor in cfg.items('usuarios'):
            nome, _, cargo = valor.partition('|')
            lista.append((login.strip().lower(), nome.strip() or login.strip(), cargo.strip()))
    return lista or list(padrao)

def caminho(p): return p if os.path.isabs(p) else os.path.join(BASE, p)

EMPRESA        = C('empresa', 'Minha Empresa')     # nome exibido nas telas e relatórios
PORTA          = int(C('porta', '8080'))
PASTA_DADOS    = caminho(C('pasta_dados', 'dados'))
PASTA_PDFS     = os.path.join(PASTA_DADOS, 'pdfs')
PASTA_BACKUPS  = caminho(C('pasta_backups', 'backups'))
BACKUP_EXTRA   = C('copia_extra_backup', '')
BACKUP_HORAS   = float(C('backup_a_cada_horas', '24'))
BACKUP_MANTER  = int(C('backups_manter', '30'))
SESSAO_DIAS    = int(C('sessao_dias', '7'))
ARQ_DB         = os.path.join(PASTA_DADOS, 'notificacoes.db')
ARQ_HTML       = os.path.join(BASE, 'static', 'index.html')
ARQ_ICONE      = os.path.join(BASE, 'static', 'icone.ico')
MAX_CORPO      = 60 * 1024 * 1024        # 60 MB por requisição normal / PDF
MAX_IMPORT     = 1024 * 1024 * 1024      # 1 GB para importar backup da versão antiga

def etapa_nome(e):
    """'1','2',... -> 1º aviso, 2º aviso...; 'multa','multa2',... -> multa, 2ª multa... (sem limite)"""
    e = str(e or '')
    if e.isdigit(): return f'{int(e)}º aviso'
    m = re.fullmatch(r'multa(\d*)', e)
    if m: return 'multa' if not m.group(1) or m.group(1) == '1' else f'{int(m.group(1))}ª multa'
    return 'aviso'
def eh_multa(e): return str(e or '').startswith('multa')
TRAVA = threading.Lock()                 # uma escrita por vez no banco

for p in (PASTA_DADOS, PASTA_PDFS, PASTA_BACKUPS):
    os.makedirs(p, exist_ok=True)

def agora():  return datetime.datetime.now()
def agora_s(): return agora().strftime('%Y-%m-%d %H:%M:%S')
ARQ_LOG = os.path.join(PASTA_DADOS, 'servidor.log')
ARQ_PID = os.path.join(PASTA_DADOS, 'servidor.pid')
def log(msg):
    linha = f'[{agora().strftime("%d/%m/%Y %H:%M:%S")}] {msg}'
    try: print(linha, flush=True)          # sem janela (pythonw) o print é ignorado
    except Exception: pass
    try:                                   # também grava em dados/servidor.log
        if os.path.exists(ARQ_LOG) and os.path.getsize(ARQ_LOG) > 5 * 1024 * 1024:
            os.replace(ARQ_LOG, ARQ_LOG + '.antigo')
        with open(ARQ_LOG, 'a', encoding='utf-8') as f: f.write(linha + '\n')
    except Exception: pass

# ---------------------------------------------------------------- banco
