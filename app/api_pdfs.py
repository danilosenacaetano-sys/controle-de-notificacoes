# -*- coding: utf-8 -*-
"""
api_pdfs.py — envio, abertura e remoção dos PDFs das notificações
"""
from .http_base import *

class ApiPdfs:
    """Rotas dos PDFs (cada notificação pode ter vários PDFs)."""

    def api_pdf_get(self, nid):
        with conectar() as c: r = c.execute('SELECT * FROM notificacoes WHERE id=?', (nid,)).fetchone()
        if not r or not r['pdf_arquivo']: raise Erro(404, 'PDF não encontrado.')
        arq = os.path.join(PASTA_PDFS, r['pdf_arquivo'])
        if not os.path.isfile(arq): raise Erro(404, 'O arquivo PDF não foi encontrado na pasta do servidor.')
        self.enviar_arquivo(arq, 'application/pdf', os.path.basename(arq))

    def api_pdf_put(self, u, nid):
        conteudo = self.ler_corpo()
        if not conteudo.startswith(b'%PDF'): raise Erro(400, 'O arquivo enviado não é um PDF válido.')
        with TRAVA, conectar() as c:
            r = c.execute('SELECT * FROM notificacoes WHERE id=? AND excluido=0', (nid,)).fetchone()
            if not r: raise Erro(404, 'Notificação não encontrada.')
            loja = loja_da_notif(c, r)
            rel = guardar_pdf(c, r, loja, conteudo)
            c.execute('UPDATE notificacoes SET pdf_arquivo=?, atualizado_em=?, atualizado_por=? WHERE id=?', (rel, agora_s(), u['nome'], nid))
            auditar(c, u['nome'], 'pdf', f"anexou o PDF do {desc_notif(json.loads(r['dados']))} da {desc_loja(loja)}", r['loja_id'], nid)
            nova_versao(c)
        self.responder(200, {'ok': True, 'arquivo': rel})

    def api_pdf_delete(self, u, nid):
        with TRAVA, conectar() as c:
            r = c.execute('SELECT * FROM notificacoes WHERE id=?', (nid,)).fetchone()
            if not r or not r['pdf_arquivo']: raise Erro(404, 'PDF não encontrado.')
            arquivar_pdf(r['pdf_arquivo'], 'removidos')
            c.execute('UPDATE notificacoes SET pdf_arquivo=NULL WHERE id=?', (nid,))
            n = json.loads(r['dados'])
            auditar(c, u['nome'], 'pdf', f"removeu o PDF do {desc_notif(n)} (arquivo guardado em pdfs/_removidos)", r['loja_id'], nid)
            nova_versao(c)
        self.responder(200, {'ok': True})

    def api_pdf_add(self, u, nid):
        """Adiciona MAIS UM PDF à notificação (sem limite). Se ela ainda não tem nenhum, este vira o principal."""
        conteudo = self.ler_corpo()
        if not conteudo.startswith(b'%PDF'): raise Erro(400, 'O arquivo enviado não é um PDF válido.')
        nome_orig = unquote(self.headers.get('X-Nome-Arquivo') or '').strip()[:150] or None
        with TRAVA, conectar() as c:
            r = c.execute('SELECT * FROM notificacoes WHERE id=? AND excluido=0', (nid,)).fetchone()
            if not r: raise Erro(404, 'Notificação não encontrada.')
            loja = loja_da_notif(c, r)
            if not r['pdf_arquivo']:
                rel = guardar_pdf(c, r, loja, conteudo)
                c.execute('UPDATE notificacoes SET pdf_arquivo=?, atualizado_em=?, atualizado_por=? WHERE id=?', (rel, agora_s(), u['nome'], nid))
            else:
                rel = guardar_pdf_extra(c, r, loja, conteudo)
                c.execute('INSERT INTO notif_pdfs(notif_id,arquivo,nome_original,criado_em,criado_por) VALUES(?,?,?,?,?)',
                          (nid, rel, nome_orig, agora_s(), u['nome']))
            auditar(c, u['nome'], 'pdf', f"anexou um PDF{f' ({nome_orig})' if nome_orig else ''} ao {desc_notif(json.loads(r['dados']))} da {desc_loja(loja)}", r['loja_id'], nid)
            nova_versao(c)
        self.responder(200, {'ok': True, 'arquivo': rel})

    def api_pdf_extra_get(self, nid, pid):
        with conectar() as c:
            r = c.execute('SELECT * FROM notif_pdfs WHERE id=? AND notif_id=? AND removido=0', (int(pid), nid)).fetchone()
        if not r: raise Erro(404, 'PDF não encontrado.')
        arq = os.path.join(PASTA_PDFS, r['arquivo'])
        if not os.path.isfile(arq): raise Erro(404, 'O arquivo PDF não foi encontrado na pasta do servidor.')
        self.enviar_arquivo(arq, 'application/pdf', r['nome_original'] or os.path.basename(arq))

    def api_pdf_extra_delete(self, u, nid, pid):
        with TRAVA, conectar() as c:
            x = c.execute('SELECT * FROM notif_pdfs WHERE id=? AND notif_id=? AND removido=0', (int(pid), nid)).fetchone()
            if not x: raise Erro(404, 'PDF não encontrado.')
            r = c.execute('SELECT * FROM notificacoes WHERE id=?', (nid,)).fetchone()
            arquivar_pdf(x['arquivo'], 'removidos')
            c.execute('UPDATE notif_pdfs SET removido=1 WHERE id=?', (x['id'],))
            auditar(c, u['nome'], 'pdf', f"removeu um PDF do {desc_notif(json.loads(r['dados']))} (arquivo guardado em pdfs/_removidos)", r['loja_id'], nid)
            nova_versao(c)
        self.responder(200, {'ok': True})
