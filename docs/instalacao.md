# Instalação

O modelo é sempre o mesmo: **um computador é o servidor** e os demais apenas acessam pelo navegador.
Os usuários finais não instalam nada.

## 1. Requisitos do servidor

| Item | Mínimo recomendado |
|---|---|
| Sistema | Windows 10/11 ou Windows Server (também roda em Linux e macOS) |
| Python | 3.9 ou mais novo |
| Memória / processador | 4 GB / 2 núcleos (sobra bastante) |
| Disco | 100 GB livres (PDFs e fotos crescem com o tempo) |
| Rede | **IP fixo** (ou reserva no DHCP) e, se possível, um nome no DNS interno |
| Energia | Nobreak |

## 2. Instalar no servidor (uma vez)

1. Copie a pasta do sistema para um disco local do servidor, por exemplo `C:\Sistemas\notificacoes`.
   **Não** use pastas sincronizadas (OneDrive, Google Drive): a sincronização pode corromper o banco.
2. Copie `config.exemplo.ini` para `config.ini` e ajuste:
   - `empresa` — nome exibido nas telas e relatórios;
   - seção `[usuarios]` — uma linha por pessoa: `login = Nome | Cargo`;
   - `copia_extra_backup` — uma pasta fora deste computador (veja [backup](backup-e-restauracao.md)).
3. Em `scripts\windows\`, rode na ordem:

| Script | O que faz |
|---|---|
| `1 - INSTALAR PYTHON (so na primeira vez).bat` | Instala o Python (pelo `winget`) se ainda não houver |
| `2 - INICIAR SERVIDOR.bat` | Liga o servidor em segundo plano e abre o sistema |
| `3 - LIBERAR ACESSO DO OUTRO COMPUTADOR (firewall).bat` | Libera a porta só para redes privadas/de domínio |
| `4 - INICIAR JUNTO COM O WINDOWS.bat` | Faz o servidor ligar sozinho quando o computador liga |
| `5 - CRIAR ICONE NA AREA DE TRABALHO.bat` | Ícone no próprio servidor |

4. Abra `dados\PRIMEIRO-ACESSO.txt`. Ele tem a **senha provisória** de cada usuário. Entregue a cada pessoa a sua; no primeiro login o sistema exige uma senha
   pessoal. Depois que todos entrarem, **apague o arquivo**.

## 3. Nos outros computadores

Depois que o servidor liga pela primeira vez, aparece a pasta `atalhos\` com:

- `ENDERECOS.txt` — os endereços do sistema (pelo nome do computador e pelo IP);
- `CRIAR ICONE NO OUTRO COMPUTADOR.bat` — leve para cada computador e rode uma vez: cria o ícone que abre o
  sistema numa janela própria (modo aplicativo do Edge/Chrome).

O TI também pode distribuir o atalho para todos os computadores por política de grupo (GPO).

**Como conferir:** na barra de endereço de todos os computadores deve aparecer o endereço do servidor
(`http://192.168.x.x:8080`), nunca `localhost` (fora do servidor) nem `file:///`.

## 4. Atualizar para uma versão nova

1. `scripts\windows\DESLIGAR SERVIDOR.bat`.
2. Substitua `app\`, `static\`, `scripts\` e `servidor.py` pelos da versão nova.
   **Não mexa** em `dados\`, `backups\` e `config.ini`.
3. `scripts\windows\2 - INICIAR SERVIDOR.bat`. Migrações do banco são automáticas e só acrescentam.
4. Nos navegadores, `Ctrl+F5` uma vez.

## 5. Comandos úteis (na pasta do sistema)

```bat
py servidor.py --backup                     :: faz um backup agora
py servidor.py --redefinir-senha LOGIN      :: senha provisória nova para um usuário
py servidor.py --novo-usuario LOGIN "Nome"  :: cria um usuário pela linha de comando
```

## 6. Começar do zero

`scripts\windows\ZERAR DADOS (comecar do zero).bat` renomeia `dados\` e `backups\` para
`dados-antigos-DATA\` / `backups-antigos-DATA\` (nada é apagado) e liga o sistema vazio, com novas senhas
provisórias.
