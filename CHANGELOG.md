# Histórico de versões

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem
[SemVer](https://semver.org/lang/pt-BR/).

## [1.0.0] — 2026-10

### Adicionado
- Cadastro de lojas e notificações com PDF; ocorrências com 1º, 2º, 3º aviso e multas.
- Baixa e reabertura com motivo; vencimentos do mais urgente ao menos urgente.
- Dashboard, gráficos, histórico com filtros e relatórios em Excel.
- Importação dos dados da versão antiga.
- Senhas com PBKDF2-SHA256, senha provisória no primeiro acesso, bloqueio por tentativas.
- Auditoria, exclusão lógica, backup automático com retenção e cópia extra.
- Configuração por `config.ini` ou variáveis `APP_*`; nome da empresa configurável.
- Testes automatizados (Windows e Linux) via GitHub Actions.
