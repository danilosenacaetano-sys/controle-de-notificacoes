# -*- coding: utf-8 -*-
"""
arquivos.py — PDFs das notificações (guardados por loja) e backups automáticos
"""
from .banco import *

def loja_da_notif(c, r):
    """Loja de uma notificação (cadastrada, ou a digitada numa notificação avulsa)."""
    lr = c.execute('SELECT dados FROM lojas WHERE id=?', (r['loja_id'],)).fetchone() if r['loja_id'] else None
    if lr: return json.loads(lr['dados'])
    n = json.loads(r['dados'])
    return {'numero': n.get('numero_loja', '?'), 'nome': n.get('nome_loja', '?')}

def pasta_da_loja(l):
    return os.path.join(PASTA_PDFS, nome_arquivo(f"{l.get('numero','')} - {l.get('nome','')}", 'LOJA'))

def guardar_pdf(c, notif_row, loja, conteudo):
    """Salva o PDF em pdfs/<LOJA>/<Notificacoes|Multas>/<numero>.pdf. Nunca apaga o anterior: move para _substituidos."""
    n = json.loads(notif_row['dados'])
    sub = 'Multas' if eh_multa(n.get('etapa')) else ('Avulsas (Vencimentos)' if n.get('avulsa') else 'Notificacoes')
    pasta = os.path.join(pasta_da_loja(loja), sub)
    os.makedirs(pasta, exist_ok=True)
    base = nome_arquivo(str(n.get('numero_notificacao', '')).replace('/', '-'), notif_row['id'])
    destino = os.path.join(pasta, base + '.pdf'); i = 2
    while os.path.exists(destino) and os.path.relpath(destino, PASTA_PDFS) != (notif_row['pdf_arquivo'] or ''):
        destino = os.path.join(pasta, f'{base}_{i}.pdf'); i += 1
    arquivar_pdf(notif_row['pdf_arquivo'], 'substituidos')
    with open(destino, 'wb') as f:
        f.write(conteudo)
    return os.path.relpath(destino, PASTA_PDFS)

def guardar_pdf_extra(c, notif_row, loja, conteudo):
    """Salva um PDF ADICIONAL da notificação na mesma pasta, com um nome livre (nunca sobrescreve nada)."""
    n = json.loads(notif_row['dados'])
    sub = 'Multas' if eh_multa(n.get('etapa')) else ('Avulsas (Vencimentos)' if n.get('avulsa') else 'Notificacoes')
    pasta = os.path.join(pasta_da_loja(loja), sub)
    os.makedirs(pasta, exist_ok=True)
    base = nome_arquivo(str(n.get('numero_notificacao', '')).replace('/', '-'), notif_row['id'])
    i = 2
    while True:
        destino = os.path.join(pasta, f'{base}_{i}.pdf')
        if not os.path.exists(destino): break
        i += 1
    with open(destino, 'wb') as f:
        f.write(conteudo)
    return os.path.relpath(destino, PASTA_PDFS)

def lista_pdfs(c, r):
    """Todos os PDFs de uma notificação: o principal (coluna pdf_arquivo) + os adicionais."""
    out = []
    if r['pdf_arquivo']:
        out.append({'id': 'principal', 'nome': os.path.basename(r['pdf_arquivo'])})
    for x in c.execute('SELECT id, arquivo, nome_original FROM notif_pdfs WHERE notif_id=? AND removido=0 ORDER BY id', (r['id'],)):
        out.append({'id': str(x['id']), 'nome': x['nome_original'] or os.path.basename(x['arquivo'])})
    return out

def arquivar_pdf(rel, motivo):
    """Move um PDF antigo para pdfs/_<motivo>/ (nada é apagado de verdade)."""
    if not rel: return
    orig = os.path.join(PASTA_PDFS, rel)
    if not os.path.isfile(orig): return
    dest_dir = os.path.join(PASTA_PDFS, '_' + motivo, os.path.dirname(rel))
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, agora().strftime('%Y%m%d-%H%M%S_') + os.path.basename(rel))
    shutil.move(orig, dest)

# ---------------------------------------------------------------- backup
def fazer_backup(motivo='automático'):
    nome = f"backup-{agora().strftime('%Y-%m-%d_%H%M%S')}.zip"
    destino = os.path.join(PASTA_BACKUPS, nome)
    tmpdir = tempfile.mkdtemp(prefix='bkp_')
    try:
        copia_db = os.path.join(tmpdir, 'notificacoes.db')
        src = conectar(); dst = sqlite3.connect(copia_db)
        with dst: src.backup(dst)                       # cópia consistente mesmo com o sistema em uso
        dst.close()
        dados = exportar_json(src); src.close()
        with zipfile.ZipFile(destino + '.tmp', 'w', zipfile.ZIP_DEFLATED) as z:
            z.write(copia_db, 'notificacoes.db')
            z.writestr('dados-legiveis.json', json.dumps(dados, ensure_ascii=False, indent=1))
            z.writestr('LEIA-ME.txt', f'Backup do Controle de Notificações — {EMPRESA}\r\n'
                       f'Gerado em {agora().strftime("%d/%m/%Y %H:%M")} ({motivo}).\r\n\r\n'
                       'Para restaurar: pare o servidor, copie notificacoes.db para a pasta "dados" '
                       'e a pasta "pdfs" para "dados\\pdfs", e inicie o servidor novamente.\r\n')
            for raiz, _, arqs in os.walk(PASTA_PDFS):
                for a in arqs:
                    p = os.path.join(raiz, a)
                    z.write(p, os.path.join('pdfs', os.path.relpath(p, PASTA_PDFS)))
        os.replace(destino + '.tmp', destino)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
    # mantém só os N mais recentes
    antigos = sorted(f for f in os.listdir(PASTA_BACKUPS) if f.startswith('backup-') and f.endswith('.zip'))
    for f in antigos[:-BACKUP_MANTER] if BACKUP_MANTER > 0 else []:
        try: os.remove(os.path.join(PASTA_BACKUPS, f))
        except OSError: pass
    extra_ok = None
    if BACKUP_EXTRA:
        try:
            os.makedirs(BACKUP_EXTRA, exist_ok=True)
            shutil.copy2(destino, os.path.join(BACKUP_EXTRA, nome)); extra_ok = True
            extras = sorted(f for f in os.listdir(BACKUP_EXTRA) if f.startswith('backup-') and f.endswith('.zip'))
            for f in extras[:-BACKUP_MANTER] if BACKUP_MANTER > 0 else []:
                try: os.remove(os.path.join(BACKUP_EXTRA, f))
                except OSError: pass
        except Exception as e:
            extra_ok = False; log(f'Aviso: não foi possível copiar o backup para {BACKUP_EXTRA}: {e}')
    with TRAVA, conectar() as c:
        meta_set(c, 'ultimo_backup', agora_s())
        meta_set(c, 'ultimo_backup_arquivo', nome)
    log(f'Backup {motivo} criado: {destino}' + (' (+ cópia extra)' if extra_ok else ''))
    return destino

def exportar_json(c):
    return {
        'app': 'notificacoes', 'exportado_em': agora_s(),
        'lojas': [dict(json.loads(r['dados']), id=r['id'], excluido=bool(r['excluido'])) for r in c.execute('SELECT * FROM lojas')],
        'notificacoes': [dict(json.loads(r['dados']), id=r['id'], loja_id=r['loja_id'], pdf_arquivo=r['pdf_arquivo'], excluido=bool(r['excluido']))
                         for r in c.execute('SELECT * FROM notificacoes')],
        'auditoria': [dict(r) for r in c.execute('SELECT * FROM auditoria ORDER BY id')],
        'pdfs_adicionais': [dict(r) for r in c.execute('SELECT * FROM notif_pdfs ORDER BY id')],
    }

def rotina_backup():
    while True:
        try:
            with conectar() as c: ult = meta_get(c, 'ultimo_backup')
            precisa = True
            if ult:
                dif = agora() - datetime.datetime.strptime(ult, '%Y-%m-%d %H:%M:%S')
                precisa = dif.total_seconds() >= BACKUP_HORAS * 3600
            if precisa: fazer_backup('automático')
        except Exception:
            log('Erro no backup automático:\n' + traceback.format_exc())
        time.sleep(600)   # verifica a cada 10 minutos
