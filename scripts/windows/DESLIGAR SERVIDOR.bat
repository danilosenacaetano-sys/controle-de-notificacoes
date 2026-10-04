@echo off
chcp 65001 >nul
rem pasta do sistema (dois niveis acima de scripts\windows)
for %%i in ("%~dp0..\..") do set "RAIZ=%%~fi"
cd /d "%RAIZ%"
title Desligar servidor - Controle de Notificacoes
if exist "dados\servidor.pid" powershell -NoProfile -Command "$p = [int](Get-Content 'dados\servidor.pid' -TotalCount 1); Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -eq $p -and $_.CommandLine -like '*servidor.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul
del "dados\servidor.pid" >nul 2>nul
echo.
echo  Servidor DESLIGADO. Para ligar de novo, use "2 - INICIAR SERVIDOR.bat".
echo.
pause
