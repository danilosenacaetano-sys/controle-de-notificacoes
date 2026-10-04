@echo off
chcp 65001 >nul
rem pasta do sistema (dois niveis acima de scripts\windows)
for %%i in ("%~dp0..\..") do set "RAIZ=%%~fi"
cd /d "%RAIZ%"
title SERVIDOR - Controle de Notificacoes (com janela)
set "PY="
py -3 --version >nul 2>nul && set "PY=py -3"
if not defined PY python --version >nul 2>nul && set "PY=python"
if not defined PY (
  echo  O Python nao foi encontrado. Rode primeiro "1 - INSTALAR PYTHON (so na primeira vez).bat".
  pause
  exit /b
)
%PY% servidor.py
echo.
echo  O servidor foi encerrado. Se foi um erro, tire uma foto desta tela.
pause
