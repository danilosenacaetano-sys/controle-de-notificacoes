#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servidor do Controle de Notificações
================================================================
- Usa SOMENTE a biblioteca padrão do Python 3.8+ (não precisa instalar pacotes).
- Banco de dados centralizado em SQLite (arquivo dados/notificacoes.db).
- PDFs guardados em pastas por loja: dados/pdfs/<LOJA>/Notificacoes | Multas.
- Login individual (senha com hash PBKDF2), registro de alterações e backup automático.

Organização do código:
    servidor.py        -> este arquivo (só liga o sistema)
    app/               -> código do servidor, dividido por assunto
    static/index.html  -> página do sistema
    static/css/        -> aparência (cores, tamanhos, telas)
    static/js/         -> funcionamento das telas

Uso:
    python servidor.py                          -> inicia o servidor
    python servidor.py --redefinir-senha LOGIN  -> define nova senha para um usuário
    python servidor.py --novo-usuario LOGIN "Nome"  -> cria um novo usuário
    python servidor.py --backup                 -> faz um backup agora e sai
"""
from app.inicio import main

if __name__ == '__main__':
    main()
