@echo off
chcp 65001 >nul
title Liberar acesso na rede - Controle de Notificacoes
net session >nul 2>nul
if %errorlevel% neq 0 (
  echo Pedindo permissao de administrador...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
netsh advfirewall firewall delete rule name="Controle de Notificacoes (porta 8080)" >nul 2>nul
netsh advfirewall firewall add rule name="Controle de Notificacoes (porta 8080)" dir=in action=allow protocol=TCP localport=8080 profile=private,domain
echo.
echo  Pronto! Os outros computadores da rede interna ja podem acessar o sistema.
echo  (Se mudar a porta no config.ini, troque 8080 neste arquivo.)
echo.
pause
