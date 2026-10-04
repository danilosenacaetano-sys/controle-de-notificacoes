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
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Controle de Notificacoes.lnk')); $s.TargetPath=$env:PYW; $s.Arguments=$env:ARGS; $s.WorkingDirectory=$env:RAIZ; $s.IconLocation=$env:ICO; $s.Description='Controle de Notificacoes'; $s.Save()"
echo.
echo  Pronto! Foi criado o icone "Controle de Notificacoes" na Area de Trabalho.
echo.
pause
