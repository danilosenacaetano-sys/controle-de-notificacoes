# -*- coding: utf-8 -*-
"""
api_dados.py — leitura dos dados, registro de alterações, backup, lojas e notificações
"""
from .http_base import *

class ApiDados:
    """Rotas de leitura e gravação de lojas e notificações."""

    def api_dados(self):
        with conectar() as c:
            lojas = [dict(json.loads(r['dados']), id=r['id']) for r in c.execute('SELECT * FROM lojas WHERE excluido=0')]
            notifs = []
            for r in c.execute('SELECT * FROM notificacoes WHERE excluido=0').fetchall():
                pdfs = lista_pdfs(c, r)
                notifs.append(dict(json.loads(r['dados']), id=r['id'], loja_id=r['loja_id'], tem_pdf=bool(pdfs), pdfs=pdfs))
            v = int(meta_get(c, 'versao', '0'))
        self.responder(200, {'lojas': lojas, 'notificacoes': notifs, 'versao': v})

    def api_auditoria(self, q):
        lim = min(int((q.get('limite') or ['200'])[0]), 1000)
        ids = [x for x in (q.get('notif') or [''])[0].split(',') if re.fullmatch(r'[\w-]{1,64}', x)][:200]
        with conectar() as c:
            if ids:
                rows = [dict(r) for r in c.execute(f'SELECT * FROM auditoria WHERE notif_id IN ({",".join("?" * len(ids))}) ORDER BY id', ids)]
            else:
                rows = [dict(r) for r in c.execute('SELECT * FROM auditoria WHERE acao<>"login" ORDER BY id DESC LIMIT ?', (lim,))]
        self.responder(200, rows)

    def api_backup_info(self):
        with conectar() as c:
            info = {'ultimo': meta_get(c, 'ultimo_backup'), 'arquivo': meta_get(c, 'ultimo_backup_arquivo'),
                    'pasta': PASTA_BACKUPS, 'copia_extra': BACKUP_EXTRA or None, 'a_cada_horas': BACKUP_HORAS, 'manter': BACKUP_MANTER,
                    'pasta_pdfs': PASTA_PDFS}
        info['quantidade'] = len([f for f in os.listdir(PASTA_BACKUPS) if f.startswith('backup-') and f.endswith('.zip')])
        self.responder(200, info)

    def api_backup_download(self, u):
        arq = fazer_backup(f'manual, por {u["nome"]}')
        with TRAVA, conectar() as c: auditar(c, u['nome'], 'backup', 'baixou um backup completo do sistema')
        self.enviar_arquivo(arq, 'application/zip', os.path.basename(arq), inline=False)

    # ---- lojas
    def api_salvar_loja(self, u, lid):
        d = self.ler_json()
        numero, nome = maiusc(d.get('numero')), maiusc(d.get('nome'))
        if not numero or not nome: raise Erro(400, 'Informe o número e o nome da loja.')
        with TRAVA, conectar() as c:
            for r in c.execute('SELECT id,dados FROM lojas WHERE excluido=0'):
                if r['id'] != lid and maiusc(json.loads(r['dados']).get('numero')) == numero:
                    raise Erro(409, f'Já existe uma loja com o número {numero}.')
            if lid:
                r = c.execute('SELECT * FROM lojas WHERE id=? AND excluido=0', (lid,)).fetchone()
                if not r: raise Erro(404, 'Loja não encontrada.')
                ant = json.loads(r['dados']); novo = dict(ant, numero=numero, nome=nome)
                c.execute('UPDATE lojas SET dados=?, atualizado_em=?, atualizado_por=? WHERE id=?', (json.dumps(novo, ensure_ascii=False), agora_s(), u['nome'], lid))
                for nr in c.execute('SELECT id,dados FROM notificacoes WHERE loja_id=?', (lid,)).fetchall():
                    nd = json.loads(nr['dados']); nd['numero_loja'], nd['nome_loja'] = numero, nome
                    c.execute('UPDATE notificacoes SET dados=? WHERE id=?', (json.dumps(nd, ensure_ascii=False), nr['id']))
                mud = []
                if ant.get('numero') != numero: mud.append(f"número {ant.get('numero')} → {numero}")
                if ant.get('nome') != nome: mud.append(f"nome {ant.get('nome')} → {nome}")
                auditar(c, u['nome'], 'loja_editada', f"editou a {desc_loja(novo)}" + (f" ({'; '.join(mud)})" if mud else ''), lid)
            else:
                lid = str(d.get('id') or secrets.token_hex(8))
                if not re.fullmatch(r'[\w-]{1,64}', lid): lid = secrets.token_hex(8)
                novo = {'numero': numero, 'nome': nome}
                c.execute('INSERT INTO lojas(id,dados,criado_em,atualizado_em,atualizado_por) VALUES(?,?,?,?,?)',
                          (lid, json.dumps(novo, ensure_ascii=False), agora_s(), agora_s(), u['nome']))
                auditar(c, u['nome'], 'loja_criada', f"cadastrou a {desc_loja(novo)}", lid)
            nova_versao(c)
        self.responder(200, dict(novo, id=lid))

    def api_excluir_loja(self, u, lid):
        with TRAVA, conectar() as c:
            r = c.execute('SELECT * FROM lojas WHERE id=? AND excluido=0', (lid,)).fetchone()
            if not r: raise Erro(404, 'Loja não encontrada.')
            l = json.loads(r['dados'])
            # exclusão "lógica": os registros continuam no banco (e nos backups), apenas deixam de aparecer
            c.execute('UPDATE lojas SET excluido=1, atualizado_em=?, atualizado_por=? WHERE id=?', (agora_s(), u['nome'], lid))
            q = c.execute('UPDATE notificacoes SET excluido=1, atualizado_em=?, atualizado_por=? WHERE loja_id=? AND excluido=0',
                          (agora_s(), u['nome'], lid)).rowcount
            auditar(c, u['nome'], 'loja_excluida', f"excluiu a {desc_loja(l)} ({q} registro(s) de notificação ocultados)", lid)
            nova_versao(c)
        self.responder(200, {'ok': True})

    # ---- notificações
    def api_salvar_notif(self, u, nid):
        d = self.ler_json()
        for k in ('id', 'tem_pdf', 'pdfs', 'pdf_id', 'pdf_url', 'pdf_arquivo'): d.pop(k, None)
        d['infracao'] = maiusc(d.get('infracao'))
        if not d.get('infracao') or not d.get('numero_notificacao') or not d.get('data_encaminhamento'):
            raise Erro(400, 'Preencha infração, número e data.')
        with TRAVA, conectar() as c:
            if d.get('avulsa'):
                # notificação avulsa (criada em Vencimentos): a loja é só digitada, sem cadastro
                d['numero_loja'], d['nome_loja'] = maiusc(d.get('numero_loja')), maiusc(d.get('nome_loja'))
                if not d['numero_loja'] or not d['nome_loja']: raise Erro(400, 'Informe o número e o nome da loja.')
                loja = {'numero': d['numero_loja'], 'nome': d['nome_loja']}
                d.pop('loja_id', None); lid = ''
            else:
                lr = c.execute('SELECT * FROM lojas WHERE id=? AND excluido=0', (d.get('loja_id'),)).fetchone()
                if not lr: raise Erro(400, 'Loja não encontrada.')
                loja = json.loads(lr['dados']); d['numero_loja'], d['nome_loja'] = loja['numero'], loja['nome']
                lid = d.pop('loja_id')
            if nid:
                r = c.execute('SELECT * FROM notificacoes WHERE id=? AND excluido=0', (nid,)).fetchone()
                if not r: raise Erro(404, 'Notificação não encontrada.')
                ant = json.loads(r['dados'])
                c.execute('UPDATE notificacoes SET loja_id=?, dados=?, atualizado_em=?, atualizado_por=? WHERE id=?',
                          (lid, json.dumps(d, ensure_ascii=False), agora_s(), u['nome'], nid))
                if not ant.get('baixada') and d.get('baixada'):
                    txt = f"deu baixa no {desc_notif(d)} da {desc_loja(loja)}"
                    if d.get('data_baixa'): txt += f" em {'/'.join(reversed(d['data_baixa'].split('-')))}"
                    auditar(c, u['nome'], 'baixa', txt, lid, nid)
                elif ant.get('baixada') and not d.get('baixada'):
                    auditar(c, u['nome'], 'reaberta', f"reabriu o {desc_notif(d)} da {desc_loja(loja)}", lid, nid)
                else:
                    campos = {'infracao': 'infração', 'numero_notificacao': 'número', 'etapa': 'etapa', 'data_encaminhamento': 'data',
                              'prazo_dias': 'prazo', 'observacoes': 'observações'}
                    mud = [nome for k, nome in campos.items() if str(ant.get(k) or '') != str(d.get(k) or '')]
                    auditar(c, u['nome'], 'notif_editada', f"alterou o {desc_notif(d)} da {desc_loja(loja)}" + (f" ({', '.join(mud)})" if mud else ''), lid, nid)
            else:
                nid = str(secrets.token_hex(8))
                c.execute('INSERT INTO notificacoes(id,loja_id,dados,criado_em,atualizado_em,atualizado_por) VALUES(?,?,?,?,?,?)',
                          (nid, lid, json.dumps(d, ensure_ascii=False), agora_s(), agora_s(), u['nome']))
                if d.get('origem_id'):
                    auditar(c, u['nome'], 'aviso_adicionado', f"adicionou o {desc_notif(d)} à {desc_loja(loja)}", lid, nid)
                else:
                    auditar(c, u['nome'], 'ocorrencia_criada', f"registrou nova ocorrência na {desc_loja(loja)}: {desc_notif(d)}", lid, nid)
            nova_versao(c)
        self.responder(200, dict(d, id=nid, loja_id=lid))

    def api_excluir_notif(self, u, nid):
        with TRAVA, conectar() as c:
            r = c.execute('SELECT * FROM notificacoes WHERE id=? AND excluido=0', (nid,)).fetchone()
            if not r: raise Erro(404, 'Notificação não encontrada.')
            n = json.loads(r['dados'])
            c.execute('UPDATE notificacoes SET excluido=1, atualizado_em=?, atualizado_por=? WHERE id=?', (agora_s(), u['nome'], nid))
            auditar(c, u['nome'], 'notif_excluida', f"excluiu o {desc_notif(n)} da loja {n.get('numero_loja')} — {n.get('nome_loja')}", r['loja_id'], nid)
            nova_versao(c)
        self.responder(200, {'ok': True})
