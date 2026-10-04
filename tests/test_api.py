"""
Testes do Controle de Notificações.
Rodar (na pasta notificacoes):   python -m unittest discover -s tests -v
"""
import unittest

from apoio import Cliente, ServidorDeTeste, TestesComuns

PDF = b'%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'


class TestNotificacoes(TestesComuns, ServidorDeTeste):

    def test_fluxo_loja_notificacao_pdf_e_baixa(self):
        c = self.entrar()
        st, loja = c.pedir('POST', '/api/lojas', {'numero': '101', 'nome': 'loja de teste'})
        self.assertEqual(st, 200)
        st, _ = c.pedir('POST', '/api/lojas', {'numero': '101', 'nome': 'outra'})
        self.assertEqual(st, 409, 'número de loja repetido deve ser recusado')
        st, n = c.pedir('POST', '/api/notificacoes', {'loja_id': loja['id'], 'infracao': 'vazamento', 'numero_notificacao': '001/2026',
                                                     'etapa': '1', 'data_encaminhamento': '2026-01-10', 'prazo_dias': 5})
        self.assertEqual(st, 200)
        self.assertEqual(n['infracao'], 'VAZAMENTO')
        st, _ = c.pedir('POST', f"/api/notificacoes/{n['id']}/pdfs", PDF, 'application/pdf')
        self.assertEqual(st, 200)
        st, _ = c.pedir('POST', f"/api/notificacoes/{n['id']}/pdfs", b'nao-e-pdf', 'application/pdf')
        self.assertEqual(st, 400, 'arquivo que não é PDF deve ser recusado')
        st, d = c.pedir('GET', '/api/dados')
        self.assertEqual(len(d['lojas']), 1)
        self.assertTrue(d['notificacoes'][0]['tem_pdf'])
        st, aud = c.pedir('GET', '/api/auditoria')
        self.assertTrue(any(a['usuario'] == 'Administrador' for a in aud), 'as alterações devem ficar registradas')

    def test_exclusao_nao_apaga_de_verdade(self):
        c = self.entrar()
        st, loja = c.pedir('POST', '/api/lojas', {'numero': '202', 'nome': 'loja temporaria'})
        st, _ = c.pedir('DELETE', f"/api/lojas/{loja['id']}")
        self.assertEqual(st, 200)
        st, d = c.pedir('GET', '/api/dados')
        self.assertFalse(any(l['id'] == loja['id'] for l in d['lojas']))
        st, aud = c.pedir('GET', '/api/auditoria')
        self.assertTrue(any('202' in a['descricao'] for a in aud))


if __name__ == '__main__':
    unittest.main()
