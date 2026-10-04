# -*- coding: utf-8 -*-
"""
inicio.py — linha de comando, atalhos, abertura do sistema e função main()
"""
from .rotas import *

def ips_locais():
    ips = set()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(('10.255.255.255', 1)); ips.add(s.getsockname()[0]); s.close()
    except Exception: pass
    try:
        for i in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET): ips.add(i[4][0])
    except Exception: pass
    return sorted(ip for ip in ips if not ip.startswith('127.'))

def abrir_sistema(url=None):
    """Abre o sistema numa janela própria (modo aplicativo do Edge/Chrome); se não houver, no navegador padrão."""
    url = url or f'http://localhost:{PORTA}'
    if os.name == 'nt' and C('modo_aplicativo', 'sim').lower() in ('sim', 's', '1', 'true'):
        cands = []
        for var in ('ProgramFiles(x86)', 'ProgramFiles', 'LocalAppData'):
            raiz = os.environ.get(var)
            if raiz:
                cands += [os.path.join(raiz, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
                          os.path.join(raiz, 'Google', 'Chrome', 'Application', 'chrome.exe')]
        for exe in cands:
            if os.path.isfile(exe):
                try:
                    subprocess.Popen([exe, f'--app={url}', '--window-size=1400,900']); return
                except Exception: pass
    webbrowser.open(url)

BAT_OUTRO_COMPUTADOR = r'''@echo off
chcp 65001 >nul
title Criar icone do Controle de Notificacoes
echo.
echo  Criando o icone "Controle de Notificacoes" na Area de Trabalho...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$urls=@(__URLS__); $url=$null; foreach($u in $urls){ try{ Invoke-WebRequest ($u+'/icone.ico') -UseBasicParsing -TimeoutSec 4 | Out-Null; $url=$u; break }catch{} }; if(-not $url){ $url=$urls[0]; Write-Host '  ATENCAO: o servidor nao respondeu agora (o computador servidor esta ligado?). O icone sera criado mesmo assim.' }; $d=Join-Path $env:APPDATA 'ControleNotificacoes'; New-Item -ItemType Directory -Force $d | Out-Null; $ico=Join-Path $d 'icone.ico'; try{ Invoke-WebRequest ($url+'/icone.ico') -OutFile $ico -UseBasicParsing -TimeoutSec 4 }catch{}; $e=@((Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),(Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),(Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe')) | Where-Object { Test-Path $_ } | Select-Object -First 1; $s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Controle de Notificacoes.lnk')); if($e){ $s.TargetPath=$e; $s.Arguments=('--app='+$url+' --window-size=1400,900') } else { $s.TargetPath='explorer.exe'; $s.Arguments=$url }; if(Test-Path $ico){ $s.IconLocation=$ico }; $s.Description='Controle de Notificacoes'; $s.Save(); Write-Host ('  Endereco usado: '+$url)"
echo.
echo  Pronto! Agora e so clicar no icone "Controle de Notificacoes" na Area de Trabalho.
echo.
pause
'''

def criar_atalhos():
    """Cria a pasta "atalhos" com os endereços do sistema e o arquivo que cria o ícone nos outros computadores."""
    if C('criar_atalhos', 'sim').lower() in ('nao', 'não', 'n', '0', 'false'):
        return
    pasta = os.path.join(BASE, 'atalhos')
    try:
        os.makedirs(pasta, exist_ok=True)
        ips, nome_pc = ips_locais(), socket.gethostname()
        urls = [f'http://{nome_pc}:{PORTA}'] + [f'http://{ip}:{PORTA}' for ip in ips]

        def url(arquivo, endereco):
            with open(os.path.join(pasta, arquivo), 'w', encoding='utf-8') as f:
                f.write(f'[InternetShortcut]\r\nURL={endereco}/\r\n')
        url('Abrir (neste computador).url', f'http://localhost:{PORTA}')
        url('Abrir (outro computador).url', urls[0])
        if ips:
            url('Abrir pelo IP (outro computador).url', urls[1])
        with open(os.path.join(pasta, 'ENDERECOS.txt'), 'w', encoding='utf-8-sig', newline='\r\n') as f:
            f.write(f'CONTROLE DE NOTIFICAÇÕES — ENDEREÇOS DO SISTEMA\n\n')
            f.write(f'Neste computador (servidor):  http://localhost:{PORTA}\n\n')
            f.write('Nos outros computadores (digite no navegador um destes):\n')
            f.writelines(f'   {u}\n' for u in urls)
            f.write(f'\nAtualizado em {agora().strftime("%d/%m/%Y %H:%M")}.\n')
        with open(os.path.join(pasta, 'CRIAR ICONE NO OUTRO COMPUTADOR.bat'), 'w', encoding='utf-8', newline='\r\n') as f:
            f.write(BAT_OUTRO_COMPUTADOR.replace('__URLS__', ','.join(f"'{u}'" for u in urls)))
    except Exception as e:
        log(f'Aviso: não foi possível criar os atalhos: {e}')


def main():
    iniciar_banco()
    args = sys.argv[1:]
    if args[:1] == ['--redefinir-senha'] and len(args) >= 2:
        s1 = getpass.getpass('Nova senha: '); s2 = getpass.getpass('Repita a nova senha: ')
        if s1 != s2 or len(s1) < 6: print('As senhas não conferem ou têm menos de 6 caracteres.'); return
        with conectar() as c:
            u = c.execute('SELECT id FROM usuarios WHERE login=?', (args[1].lower(),)).fetchone()
            if not u: print('Usuário não encontrado.'); return
            definir_senha(c, u['id'], s1, 1); auditar(c, 'Servidor', 'senha', f'redefiniu a senha do usuário {args[1]}')
        print('Senha redefinida. O usuário deverá trocá-la no próximo acesso.'); return
    if args[:1] == ['--novo-usuario'] and len(args) >= 3:
        s1 = getpass.getpass('Senha inicial: ')
        if len(s1) < 6: print('A senha precisa ter pelo menos 6 caracteres.'); return
        with conectar() as c:
            criar_usuario(c, args[1], args[2], s1); auditar(c, 'Servidor', 'usuario', f'criou o usuário {args[1]} ({args[2]})')
        print('Usuário criado.'); return
    if args[:1] == ['--backup']:
        print('Backup criado em:', fazer_backup('manual (linha de comando)')); return

    # Se o sistema já está ligado, só abre a janela dele
    if servidor_ja_ligado():
        log('O servidor já está ligado. Abrindo o sistema.')
        abrir_sistema(); return
    # Liga o servidor (tenta por até 3 minutos, caso a porta ainda esteja sendo liberada pelo Windows)
    srv = None
    for tentativa in range(90):
        try:
            srv = Servidor(('0.0.0.0', PORTA), Handler); break
        except OSError as e:
            if servidor_ja_ligado():
                log('O servidor já está ligado. Abrindo o sistema.')
                abrir_sistema(); return
            if tentativa == 0: log(f'Porta {PORTA} ainda ocupada ({e}). Aguardando para ligar...')
            time.sleep(2)
    if srv is None:
        aviso_windows(f'Não foi possível ligar o sistema: a porta {PORTA} está sendo usada por outro programa.\n\n'
                      'Reinicie o computador e tente de novo. Se continuar, avise quem instalou o sistema.')
        return
    try:
        with open(ARQ_PID, 'w') as f: f.write(str(os.getpid()))
    except Exception: pass
    log(f'Servidor ligado na porta {PORTA}.')
    threading.Thread(target=rotina_backup, daemon=True).start()
    srv.daemon_threads = True
    print('=' * 64)
    print(f'  CONTROLE DE NOTIFICAÇÕES — {EMPRESA.upper()}')
    print('=' * 64)
    print(f'  Neste computador:  http://localhost:{PORTA}')
    print(f'  Na rede:           http://{socket.gethostname()}:{PORTA}')
    for ip in ips_locais(): print(f'                 ou: http://{ip}:{PORTA}')
    print(f'  Banco de dados:    {ARQ_DB}')
    print(f'  PDFs:              {PASTA_PDFS}')
    print(f'  Backups:           {PASTA_BACKUPS}' + (f'  (+ cópia em {BACKUP_EXTRA})' if BACKUP_EXTRA else ''))
    print('  Deixe esta janela aberta enquanto o sistema estiver em uso.')
    print('=' * 64, flush=True)
    criar_atalhos()
    if C('abrir_navegador', 'sim').lower() in ('sim', 's', '1', 'true'):
        threading.Timer(1.5, abrir_sistema).start()
    try: srv.serve_forever()
    except KeyboardInterrupt: print('Servidor encerrado.')
