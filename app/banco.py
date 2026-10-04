# -*- coding: utf-8 -*-
"""
banco.py — banco de dados SQLite: tabelas, usuários, senhas (hash), registro de alterações e textos auxiliares
"""
from .configuracao import *

def conectar():
    c = sqlite3.connect(ARQ_DB, timeout=30)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    return c

def iniciar_banco():
    with conectar() as c:
        c.execute('PRAGMA journal_mode=WAL')
        c.executescript('''
        CREATE TABLE IF NOT EXISTS usuarios(id INTEGER PRIMARY KEY, login TEXT UNIQUE NOT NULL, nome TEXT NOT NULL,
            senha_hash TEXT NOT NULL, salt TEXT NOT NULL, trocar_senha INTEGER DEFAULT 1, ativo INTEGER DEFAULT 1, criado_em TEXT);
        CREATE TABLE IF NOT EXISTS sessoes(token TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL, expira REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS lojas(id TEXT PRIMARY KEY, dados TEXT NOT NULL, excluido INTEGER DEFAULT 0,
            criado_em TEXT, atualizado_em TEXT, atualizado_por TEXT);
        CREATE TABLE IF NOT EXISTS notificacoes(id TEXT PRIMARY KEY, loja_id TEXT NOT NULL, dados TEXT NOT NULL,
            pdf_arquivo TEXT, excluido INTEGER DEFAULT 0, criado_em TEXT, atualizado_em TEXT, atualizado_por TEXT);
        CREATE INDEX IF NOT EXISTS ix_notif_loja ON notificacoes(loja_id);
        CREATE TABLE IF NOT EXISTS auditoria(id INTEGER PRIMARY KEY AUTOINCREMENT, quando TEXT NOT NULL, usuario TEXT NOT NULL,
            acao TEXT NOT NULL, descricao TEXT NOT NULL, loja_id TEXT, notif_id TEXT);
        CREATE INDEX IF NOT EXISTS ix_aud_quando ON auditoria(quando);
        CREATE TABLE IF NOT EXISTS meta(chave TEXT PRIMARY KEY, valor TEXT);
        -- PDFs adicionais de uma notificação (o primeiro PDF continua em notificacoes.pdf_arquivo)
        CREATE TABLE IF NOT EXISTS notif_pdfs(id INTEGER PRIMARY KEY AUTOINCREMENT, notif_id TEXT NOT NULL, arquivo TEXT NOT NULL,
            nome_original TEXT, removido INTEGER DEFAULT 0, criado_em TEXT, criado_por TEXT);
        CREATE INDEX IF NOT EXISTS ix_pdfs_notif ON notif_pdfs(notif_id);
        ''')
        # migrações aditivas (não apagam nada)
        if 'cargo' not in [r[1] for r in c.execute('PRAGMA table_info(usuarios)')]:
            c.execute("ALTER TABLE usuarios ADD COLUMN cargo TEXT DEFAULT ''")
        if 'cargo' not in [r[1] for r in c.execute('PRAGMA table_info(auditoria)')]:
            c.execute("ALTER TABLE auditoria ADD COLUMN cargo TEXT DEFAULT ''")
        configurar_usuarios(c)

# Usuários: definidos na seção [usuarios] do config.ini. Nenhuma senha fica no código: na primeira vez
# que um usuário é cadastrado, o sistema sorteia uma senha provisória, grava em PRIMEIRO-ACESSO.txt
# (pasta de dados, fora do repositório) e exige que a pessoa crie a senha pessoal no primeiro login.
USUARIOS = usuarios_config([('admin', 'Administrador', 'Gestão')])
ARQ_PRIMEIRO_ACESSO = os.path.join(PASTA_DADOS, 'PRIMEIRO-ACESSO.txt')


def gerar_senha_provisoria(tamanho=10):
    letras = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'   # sem letras parecidas (l, 1, O, 0)
    return ''.join(secrets.choice(letras) for _ in range(tamanho))


def anotar_primeiro_acesso(linhas):
    """Guarda as senhas provisórias num arquivo local, só para o responsável pela instalação."""
    novo = not os.path.exists(ARQ_PRIMEIRO_ACESSO)
    with open(ARQ_PRIMEIRO_ACESSO, 'a', encoding='utf-8-sig', newline='\r\n') as f:
        if novo:
            f.write('PRIMEIRO ACESSO — SENHAS PROVISÓRIAS\n'
                    'Entregue a cada pessoa a sua senha. No primeiro login o sistema pede para criar uma senha pessoal.\n'
                    'Depois que todos entrarem, apague este arquivo.\n\n')
        for txt in linhas:
            f.write(f'[{agora_s()}] {txt}\n')


def configurar_usuarios(c):
    """Cadastra os usuários do config.ini que ainda não existem (os que já existem não são alterados)."""
    novos = []
    for login, nome, cargo in USUARIOS:
        if c.execute('SELECT 1 FROM usuarios WHERE login=?', (login,)).fetchone():
            continue
        senha = gerar_senha_provisoria()
        criar_usuario(c, login, nome, senha)
        c.execute('UPDATE usuarios SET cargo=? WHERE login=?', (cargo, login))
        novos.append((login, nome, senha))
    if novos:
        anotar_primeiro_acesso([f'usuário: {lg:<14} ({nm})   senha provisória: {sn}' for lg, nm, sn in novos])
        auditar(c, 'Servidor', 'usuario', 'cadastrou os usuários ' + ', '.join(nm for _, nm, _ in novos))
        log(f'{len(novos)} usuário(s) cadastrado(s). Senhas provisórias em: {ARQ_PRIMEIRO_ACESSO}')

def meta_get(c, k, d=None):
    r = c.execute('SELECT valor FROM meta WHERE chave=?', (k,)).fetchone()
    return r[0] if r else d
def meta_set(c, k, v):
    c.execute('INSERT INTO meta(chave,valor) VALUES(?,?) ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor', (k, str(v)))
def nova_versao(c):
    v = int(meta_get(c, 'versao', '0')) + 1
    meta_set(c, 'versao', v)
    return v

# ---------------------------------------------------------------- usuários / senha
def hash_senha(senha, salt):
    return hashlib.pbkdf2_hmac('sha256', senha.encode('utf-8'), bytes.fromhex(salt), 200_000).hex()
def hash_token(t):
    return 'h:' + hashlib.sha256(t.encode('utf-8')).hexdigest()
DIAS_LEMBRAR = 90
def criar_usuario(c, login, nome, senha):
    salt = secrets.token_hex(16)
    c.execute('INSERT INTO usuarios(login,nome,senha_hash,salt,trocar_senha,criado_em) VALUES(?,?,?,?,1,?)',
              (login.lower(), nome, hash_senha(senha, salt), salt, agora_s()))
def definir_senha(c, uid, senha, trocar=0):
    salt = secrets.token_hex(16)
    c.execute('UPDATE usuarios SET senha_hash=?, salt=?, trocar_senha=? WHERE id=?', (hash_senha(senha, salt), salt, trocar, uid))

def auditar(c, usuario, acao, descricao, loja_id=None, notif_id=None):
    """Registra automaticamente quem fez (nome + cargo do usuário logado), o quê, quando e em qual registro."""
    r = c.execute('SELECT cargo FROM usuarios WHERE nome=?', (usuario,)).fetchone()
    c.execute('INSERT INTO auditoria(quando,usuario,cargo,acao,descricao,loja_id,notif_id) VALUES(?,?,?,?,?,?,?)',
              (agora_s(), usuario, (r['cargo'] if r else '') or '', acao, descricao, loja_id, notif_id))

# ---------------------------------------------------------------- helpers de texto
def sem_acento(s):
    return ''.join(ch for ch in unicodedata.normalize('NFD', s or '') if unicodedata.category(ch) != 'Mn')
def nome_arquivo(s, padrao='sem-nome'):
    s = sem_acento(str(s or '')).strip()
    s = re.sub(r'[\\/:*?"<>|]+', '-', s)
    s = re.sub(r'\s+', ' ', s).strip(' .')
    return s[:80] or padrao
def maiusc(s): return (s or '').strip().upper()

def desc_loja(l):  return f"loja {l.get('numero','?')} — {l.get('nome','?')}"
def desc_notif(n): return f"{etapa_nome(n.get('etapa'))}{' (avulsa, só em Vencimentos)' if n.get('avulsa') else ''} Nº {n.get('numero_notificacao','?')} ({n.get('infracao','')})"

# ---------------------------------------------------------------- PDFs
