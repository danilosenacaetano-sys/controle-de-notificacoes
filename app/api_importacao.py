# -*- coding: utf-8 -*-
"""
api_importacao.py — importação de dados da versão antiga (arquivo .json do navegador)
"""
from .http_base import *

class ApiImportacao:
    """Importa o backup .json da versão que guardava os dados no navegador."""

    def api_importar(self, u):
        d = self.ler_json(MAX_IMPORT)
        if not isinstance(d.get('lojas'), list) or not isinstance(d.get('notificacoes'), list):
            raise Erro(400, 'Este arquivo não é um backup do Controle de Notificações.')
        fazer_backup(f'antes de importar, por {u["nome"]}')
        pdfs = d.get('pdfs') or {}
        ql = qn = qp = pul = pun = 0
        with TRAVA, conectar() as c:
            existentes_num = {maiusc(json.loads(r['dados']).get('numero')): r['id'] for r in c.execute('SELECT id,dados FROM lojas WHERE excluido=0')}
            mapa_loja = {}
            for l in d['lojas']:
                lid = str(l.get('id') or secrets.token_hex(8)); num = maiusc(l.get('numero')); nome = maiusc(l.get('nome'))
                if c.execute('SELECT 1 FROM lojas WHERE id=?', (lid,)).fetchone(): mapa_loja[lid] = lid; pul += 1; continue
                if num in existentes_num: mapa_loja[lid] = existentes_num[num]; pul += 1; continue
                c.execute('INSERT INTO lojas(id,dados,criado_em,atualizado_em,atualizado_por) VALUES(?,?,?,?,?)',
                          (lid, json.dumps({'numero': num, 'nome': nome}, ensure_ascii=False), agora_s(), agora_s(), u['nome'] + ' (importação)'))
                mapa_loja[lid] = lid; existentes_num[num] = lid; ql += 1
            for n in d['notificacoes']:
                nid = str(n.get('id') or secrets.token_hex(8))
                if c.execute('SELECT 1 FROM notificacoes WHERE id=?', (nid,)).fetchone(): pun += 1; continue
                lid = mapa_loja.get(str(n.get('loja_id')))
                if not lid: continue
                loja = json.loads(c.execute('SELECT dados FROM lojas WHERE id=?', (lid,)).fetchone()['dados'])
                pid = n.get('pdf_id'); purl = n.get('pdf_url')
                dados = {k: v for k, v in n.items() if k not in ('id', 'loja_id', 'pdf_id', 'pdf_url', 'tem_pdf')}
                dados['infracao'] = maiusc(dados.get('infracao')); dados['numero_loja'], dados['nome_loja'] = loja['numero'], loja['nome']
                c.execute('INSERT INTO notificacoes(id,loja_id,dados,criado_em,atualizado_em,atualizado_por) VALUES(?,?,?,?,?,?)',
                          (nid, lid, json.dumps(dados, ensure_ascii=False), agora_s(), agora_s(), u['nome'] + ' (importação)'))
                qn += 1
                url = pdfs.get(pid) if pid else purl
                if url and ',' in url:
                    try:
                        conteudo = base64.b64decode(url.split(',', 1)[1])
                        r = c.execute('SELECT * FROM notificacoes WHERE id=?', (nid,)).fetchone()
                        rel = guardar_pdf(c, r, loja, conteudo)
                        c.execute('UPDATE notificacoes SET pdf_arquivo=? WHERE id=?', (rel, nid)); qp += 1
                    except Exception as e:
                        log(f'Aviso: PDF da notificação {nid} não pôde ser importado: {e}')
            auditar(c, u['nome'], 'importacao', f"importou dados da versão local: {ql} loja(s), {qn} notificação(ões) e {qp} PDF(s)"
                    + (f"; {pul} loja(s) e {pun} notificação(ões) já existiam e foram mantidas" if pul or pun else ''))
            nova_versao(c)
        self.responder(200, {'lojas': ql, 'notificacoes': qn, 'pdfs': qp, 'lojas_existentes': pul, 'notificacoes_existentes': pun})

# ---------------------------------------------------------------- linha de comando / início
