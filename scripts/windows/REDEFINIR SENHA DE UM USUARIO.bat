@echo off
chcp 65001 >nul
rem pasta do sistema (dois niveis acima de scripts\windows)
for %%i in ("%~dp0..\..") do set "RAIZ=%%~fi"
cd /d "%RAIZ%"
title Redefinir senha - Controle de Notificacoes
set "PY="
py -3 --version >nul 2>nul && set "PY=py -3"
if not defined PY python --version >nul 2>nul && set "PY=python"
if not defined PY (
  echo  O Python nao foi encontrado. Rode primeiro "1 - INSTALAR PYTHON (so na primeira vez).bat".
  pause
  exit /b
)
echo.
echo  REDEFINIR A SENHA DE UM USUARIO (nenhum dado do sistema e apagado)
echo.
set /p "USU=Digite o usuario (login): "
if "%USU%"=="" exit /b
%PY% servidor.py --redefinir-senha %USU%
echo.
echo  No proximo acesso, a pessoa entra com esta senha e cria a senha pessoal.
pause
