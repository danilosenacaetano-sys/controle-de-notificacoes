# Backup e restauração

## O que é feito automaticamente

| Item | Padrão | Onde configurar |
|---|---|---|
| Frequência | a cada 24 horas (e ao ligar, se o último for antigo) | `backup_a_cada_horas` |
| Retenção | os 30 mais recentes | `backups_manter` |
| Destino | `backups/` na pasta do sistema | `pasta_backups` |
| Cópia extra | desligada | `copia_extra_backup` |

Cada backup é um `.zip` com:

- a cópia consistente do banco SQLite (feita com a API de backup do SQLite, segura com o sistema em uso);
- os arquivos anexados (os PDFs das notificações);
- `dados-legiveis.json` — os dados em texto, legíveis sem o sistema;
- `LEIA-ME.txt` com as instruções de restauração.

Também é possível baixar um backup a qualquer momento pela tela **Dados / Backup**, ou pela linha de comando:
`py servidor.py --backup`.

## Recomendação: regra 3-2-1

- **3 cópias** dos dados (o banco em uso + 2 backups);
- em **2 lugares** diferentes;
- **1** fora do servidor.

Configure `copia_extra_backup` para uma pasta de rede/NAS com acesso restrito, por exemplo:

```ini
copia_extra_backup = \\servidor-arquivos\Backups\Notificacoes
```

E inclua a pasta do sistema na rotina de backup corporativa.

## Restaurar

1. `scripts\windows\DESLIGAR SERVIDOR.bat`.
2. Renomeie a pasta `dados` atual (por exemplo, `dados-antes-da-restauracao`) — não apague.
3. Crie uma pasta `dados` nova e extraia nela o banco do `.zip` (`notificacoes.db`) e a pasta `pdfs`.
4. `scripts\windows\2 - INICIAR SERVIDOR.bat` e confira os dados.

## Testar a restauração

Uma vez por mês, restaure o backup mais recente **em outro computador** (ou em outra pasta, com outra porta no
`config.ini`) e confira se abre normalmente. Um backup que nunca foi testado não é garantia.
