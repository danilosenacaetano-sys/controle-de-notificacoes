# Controle de Notificações

[![Testes](../../actions/workflows/testes.yml/badge.svg)](../../actions/workflows/testes.yml)

Controle das infrações das lojas: cada ocorrência tem uma sequência de avisos (1º, 2º, 3º…) e multas, com prazo, vencimento, PDFs e baixa.

Porta padrão: **8080** · Python 3.9+ · sem dependências externas.

## Sobre o projeto

Sistema web interno criado para substituir o controle de notificações feito em planilha. Roda em um computador
da rede (o servidor) e é acessado pelo navegador nos demais, sem instalar nada nas máquinas dos usuários.

Decisões de projeto:

- **Zero dependências** — só a biblioteca padrão do Python; instalação em um passo.
- **SQLite em modo WAL** — um arquivo só, sem servidor de banco.
- **Frontend sem framework** — HTML, CSS e JavaScript puros, sem etapa de build.
- **Segurança desde o início** — senhas com PBKDF2, troca obrigatória no primeiro acesso, bloqueio por tentativas,
  auditoria de todas as alterações e exclusão apenas lógica.
- **Backup automático** com retenção e cópia para outro local.
- **Testes automatizados** no Windows e no Linux a cada envio.

> Todos os nomes e dados deste repositório são fictícios. Dados reais, senhas e configurações da empresa
> nunca são versionados.

## Funcionalidades

- **Manutenção** — lojas com notificações em aberto; abrir a loja mostra cada ocorrência com todos os avisos.
- **Ocorrência** — 1º, 2º, 3º aviso… e multas, sem limite; prazo em dias e vencimento calculado; vários PDFs por aviso.
- **Baixa e reabertura** — com motivo (regularizada, reiterada, multa aplicada, cancelada, outro) e data.
- **Vencimentos** — o aviso atual de cada ocorrência em aberto, do mais urgente ao menos urgente.
- **Dashboard e Gráficos** — cartões por prazo, aviso e mês; resumo do ano, mês a mês e por loja.
- **Histórico** — todas as notificações, inclusive encerradas, com filtros.
- **Relatórios em Excel** — relatório simples, relatório do ano com gráficos e planilha de análise.
- **Importação** — traz os dados da versão antiga (arquivo `.json` salvo pelo navegador).

## Rodando

```bash
python servidor.py             # http://localhost:8080
python -m unittest discover -s tests -v
```

No Windows, use os scripts de `scripts/windows/`. Instalação completa em [docs/instalacao.md](docs/instalacao.md).

Na primeira vez, os usuários da seção `[usuarios]` do `config.ini` recebem senhas provisórias, gravadas em
`dados/PRIMEIRO-ACESSO.txt`. No primeiro login, cada pessoa cria a sua senha.

## Estrutura

```
controle-de-notificacoes/
├── servidor.py            ponto de entrada
├── config.exemplo.ini     configuração padrão (copie para config.ini)
├── app/                   servidor (Python)
│   ├── banco.py                    tabelas, usuários, senhas, auditoria
│   ├── arquivos.py                 PDFs (por loja) e backups
│   ├── api_usuarios.py             login e senha
│   ├── api_dados.py                lojas e notificações
│   ├── api_pdfs.py                 PDFs das notificações
│   ├── api_importacao.py           dados da versão antiga
│   ├── rotas.py                    roteamento
│   ├── inicio.py                   linha de comando e main()
├── static/                telas
│   ├── index.html
│   ├── css/               visual, em ordem de carga
│   └── js/                lógica das telas, em ordem de carga
│       ├── 04-ocorrencias.js           regra das ocorrências e avisos
│       ├── 05-telas-…js                Início, Manutenção, Vencimentos
│       ├── 06-dashboard.js             Dashboard
│       ├── 08-graficos.js              Gráficos
│       ├── 09-excel-relatorios.js      relatórios em Excel
│       ├── 12-formularios.js           cadastros e baixa
│       ├── 13-eventos.js               ações dos botões
├── scripts/windows/       instalar, iniciar, desligar, firewall, ícones, zerar dados
├── tests/                 testes automáticos (python -m unittest discover -s tests -v)
└── docs/                  documentação
```

## Documentação

| Documento | Conteúdo |
|---|---|
| [Instalação](docs/instalacao.md) | servidor, outros computadores, atualização, comandos |
| [Arquitetura](docs/arquitetura.md) | como o sistema é organizado por dentro |
| [Segurança](docs/seguranca.md) | o que o sistema garante e o que depende da infraestrutura |
| [Backup e restauração](docs/backup-e-restauracao.md) | backups automáticos e como restaurar |
| [Desenvolvimento](docs/desenvolvimento.md) | padrões de código, testes e receitas |

## Dados e configuração

`config.ini`, `dados/`, `backups/` e `atalhos/` ficam **fora do repositório** (veja o `.gitignore`).
Para usar, copie `config.exemplo.ini` para `config.ini` e ajuste o nome da empresa e os usuários.

## Licença

Uso interno. Veja [LICENSE](LICENSE).

## API

Todas as rotas respondem JSON e, exceto o login, exigem sessão. Gerais:

| Método | Endereço | O que faz |
|---|---|---|
| POST | `/api/login` | entra (`{login, senha}`) e recebe o cookie de sessão |
| POST | `/api/logout` | sai |
| POST | `/api/senha` | cria a senha pessoal no primeiro acesso |
| GET | `/api/eu` | usuário da sessão |
| GET | `/api/dados` | todos os dados que as telas usam |
| GET | `/api/versao` | número que muda a cada alteração (atualização automática das telas) |
| GET | `/api/auditoria` | registro de alterações |
| GET | `/api/backup` · `/api/backup/info` | baixa um backup completo · informações dos backups |

Do controle de notificações:

| Método | Endereço | O que faz |
|---|---|---|
| POST | `/api/lojas` | cadastra loja |
| PUT / DELETE | `/api/lojas/{id}` | altera / exclui (lógico) loja |
| POST | `/api/notificacoes` | registra notificação (novo aviso ou nova ocorrência) |
| PUT / DELETE | `/api/notificacoes/{id}` | altera, dá baixa, reabre / exclui |
| GET / PUT / DELETE | `/api/notificacoes/{id}/pdf` | PDF principal |
| POST | `/api/notificacoes/{id}/pdfs` | acrescenta PDF |
| POST | `/api/importar` | importa os dados da versão antiga |
