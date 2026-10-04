@echo off
chcp 65001 >nul
rem pasta do sistema (dois niveis acima de scripts\windows)
for %%i in ("%~dp0..\..") do set "RAIZ=%%~fi"
cd /d "%RAIZ%"
set "PYW="
for /f "delims=" %%i in ('where pyw 2^>nul') do if not defined PYW set "PYW=%%i"
set "ARGS=-3 servidor.py"
if not defined PYW (
  for /f "delims=" %%i in ('where pythonw 2^>nul') do if not defined PYW set "PYW=%%i"
  set "ARGS=servidor.py"
)
if not defined PYW (
  echo  O Python nao foi encontrado. Rode primeiro "1 - INSTALAR PYTHON (so na primeira vez).bat".
  pause
  exit /b
)
set "ICO=%RAIZ%\static\icone.ico"
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path ([Environment]::GetFolderPath('Startup')) 'Servidor Controle de Notificacoes.lnk')); $s.TargetPath=$env:PYW; $s.Arguments=$env:ARGS; $s.WorkingDirectory=$env:RAIZ; $s.IconLocation=$env:ICO; $s.Description='Controle de Notificacoes'; $s.Save()"
echo.
echo  Pronto! O servidor liga sozinho sempre que o computador ligar.
echo  Para desfazer: Windows+R, digite shell:startup e apague o atalho "Servidor Controle de Notificacoes".
echo.
pause
