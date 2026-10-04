@echo off
chcp 65001 >nul
rem pasta do sistema (dois niveis acima de scripts\windows)
for %%i in ("%~dp0..\..") do set "RAIZ=%%~fi"
cd /d "%RAIZ%"
title ZERAR DADOS - Controle de Notificacoes
echo.
echo  ZERAR TODOS OS DADOS DO SISTEMA
echo  O sistema volta VAZIO. Os dados atuais NAO sao apagados: ficam guardados
echo  na pasta "dados-antigos-DATA", caso precise deles depois.
echo.
set /p CONF= Para confirmar, digite ZERAR e aperte Enter: 
if /i not "%CONF%"=="ZERAR" (
  echo  Cancelado. Nada foi alterado.
  pause
  exit /b
)
if exist "dados\servidor.pid" powershell -NoProfile -Command "$p = [int](Get-Content 'dados\servidor.pid' -TotalCount 1); Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq $p -and $_.CommandLine -like '*servidor.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul
del "dados\servidor.pid" >nul 2>nul
timeout /t 3 /nobreak >nul
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set "TS=%%t"
if exist "dados" ren "dados" "dados-antigos-%TS%"
if exist "dados" (
  echo  ERRO: a pasta "dados" esta em uso. Reinicie o computador e tente de novo.
  pause
  exit /b
)
if exist "backups" ren "backups" "backups-antigos-%TS%"
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
start "" "%PYW%" %ARGS%
echo.
echo  Pronto! O sistema esta ZERADO. As novas senhas provisorias ficam em dados\PRIMEIRO-ACESSO.txt
pause
