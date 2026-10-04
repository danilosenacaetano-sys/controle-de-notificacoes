# Segurança

## O que os sistemas garantem

| Área | Como |
|---|---|
| **Senhas** | Guardadas como PBKDF2-HMAC-SHA256 com 200.000 iterações e *salt* individual. Nenhuma senha fica no código ou no `config.ini`. |
| **Primeiro acesso** | Senhas provisórias aleatórias (10 caracteres, sem letras ambíguas), gravadas só em `dados/PRIMEIRO-ACESSO.txt`. O sistema bloqueia todas as telas até a pessoa criar a senha pessoal (mínimo de 6 caracteres). |
| **Força bruta** | 5 senhas erradas seguidas para o mesmo usuário a partir do mesmo computador bloqueiam o login por 15 minutos. |
| **Sessão** | Token aleatório de 256 bits em cookie `HttpOnly` e `SameSite=Strict`; o banco guarda apenas o hash SHA-256 do token. A sessão expira sozinha. |
| **Permissões** | Todas as rotas `/api/*`, exceto o login, exigem sessão válida. |
| **Entrada de dados** | Validação no servidor (datas, números, tamanhos, campos obrigatórios). Textos exibidos passam por *escape* de HTML. |
| **Arquivos enviados** | Só PDF, conferido pela assinatura do arquivo — não pela extensão. Nomes sorteados no disco; servidos com `X-Content-Type-Options: nosniff`. |
| **Arquivos estáticos** | Caminho normalizado e restrito à pasta `static/`, só para extensões conhecidas. |
| **Rastreabilidade** | Toda alteração fica na auditoria com usuário, cargo e horário. O sistema não oferece forma de apagar a auditoria. |
| **Perda de dados** | Exclusão lógica e backup automático com retenção (veja [backup](backup-e-restauracao.md)). |

## O que depende da infraestrutura

O sistema foi feito para a **rede interna**. Os pontos abaixo são responsabilidade do ambiente:

1. **Não expor na internet.** Não abra a porta 8080 no roteador. Acesso externo, só por VPN.
2. **Restringir a porta no firewall** à rede interna (o script `3 - LIBERAR ACESSO...` já limita a perfis
   privado e de domínio) — idealmente, só às máquinas dos setores que usam o sistema.
3. **Proteger o servidor:** senha no Windows, bloqueio de tela, atualizações, antivírus e acesso físico restrito.
4. **Criptografar o disco** do servidor (BitLocker). O arquivo SQLite não é criptografado: quem tem acesso aos
   arquivos do servidor consegue copiá-lo.
5. **HTTPS (opcional):** o tráfego é HTTP. Em rede interna confiável isso é aceitável; se a política exigir
   criptografia em trânsito, coloque um proxy reverso com certificado interno (IIS, Caddy ou nginx) na frente.
6. **Backups** fora do servidor, com acesso restrito à pasta de destino.

## Dados pessoais (LGPD)

O sistema guarda o mínimo necessário: nomes de usuários e dados das lojas notificadas. Tudo fica no servidor da empresa, com acesso por senha e registro de quem consultou ou alterou.
Exportações em Excel devem seguir a política interna de compartilhamento.

## Repositório

- `config.ini`, `dados/`, `backups/`, `atalhos/` e `*.db` estão no `.gitignore` e **nunca** devem ser enviados.
- O repositório não contém senhas, tokens nem dados reais.
- O repositório é público: nenhuma personalização da empresa (nome, usuários, endereços) entra nele — tudo isso fica no `config.ini` local.

## Como reportar um problema de segurança

Não abra uma *issue* pública. Fale diretamente com o responsável pelo sistema.
