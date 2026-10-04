# Desenvolvimento

## Ambiente

Não há nada para instalar além do Python 3.9+. Para desenvolver:

```bash
python servidor.py               # http://localhost:8080
```

Com `config.ini` ausente, vale o `config.exemplo.ini`. Qualquer opção da seção `[servidor]` pode ser trocada
por variável de ambiente `APP_<OPÇÃO>` (ex.: `APP_PORTA=9000`, `APP_PASTA_DADOS=/tmp/dados`,
`APP_ABRIR_NAVEGADOR=nao`, `APP_CRIAR_ATALHOS=nao`).

## Testes

```bash
python -m unittest discover -s tests -v
```

`tests/apoio.py` liga um servidor real numa pasta temporária e porta livre, e fala com ele por HTTP, como o
navegador. Os testes cobrem: login, senha provisória e troca obrigatória, bloqueio por tentativas, acesso sem
sessão, arquivos estáticos fora da pasta, backup e os fluxos principais de cada sistema. O GitHub Actions roda
tudo em Windows e Linux a cada envio (`.github/workflows/testes.yml`).

## Padrões de código

**Geral**
- Português nos nomes de funções, variáveis e mensagens — o vocabulário do código é o mesmo do usuário.
- Arquivos pequenos e com um assunto só; cada arquivo começa com um comentário dizendo o que faz.
- Nada de dependência externa sem uma razão muito forte.

**Servidor (Python)**
- Toda gravação: `with TRAVA, conectar() as c:` → validar → gravar → `auditar(...)` → `nova_versao(c)`.
- Erros previstos: `raise Erro(status, 'mensagem para o usuário')`.
- Nunca apagar: use `excluido=1` / `removido=1` / `desfeito=1`.
- Migrações só acrescentam (`ALTER TABLE ... ADD COLUMN`), conferindo antes se a coluna existe.

**Telas (JavaScript)**
- Scripts clássicos carregados em ordem pelo `index.html`; o número no nome do arquivo é a ordem de carga.
- Estado em `state`, desenho em `render()`; ações em `ACOES` via `data-act` / `data-id`.
- Todo texto vindo do servidor passa por `esc()` antes de entrar no HTML.
- Ao mudar arquivos de `static/`, aumente o `?v=` no `index.html` para os navegadores baixarem a versão nova.

## Receitas

### Acrescentar uma rota

1. Escreva o método `api_algo(self, u, ...)` no módulo de API certo (valide, grave, audite, `nova_versao`).
2. Ligue o endereço em `rotas.py` (`if p == '/api/algo' and metodo == 'POST': return self.api_algo(u)`).
3. Escreva um teste em `tests/test_api.py`.

### Acrescentar um usuário

Inclua a linha na seção `[usuarios]` do `config.ini` e reinicie o servidor: o usuário é criado com senha
provisória (anotada em `dados/PRIMEIRO-ACESSO.txt`). Usuários existentes não são alterados.

## Antes de publicar uma versão

- [ ] Testes passando.
- [ ] `?v=` atualizado no `index.html`.
- [ ] `CHANGELOG.md` atualizado.
- [ ] Conferir que nenhum `config.ini`, `dados/` ou `*.db` entrou no commit (`git status`).
