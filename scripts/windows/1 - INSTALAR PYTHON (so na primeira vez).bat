@echo off
chcp 65001 >nul
title Instalar Python - Controle de Notificacoes
echo.
echo  Verificando o Python...
echo.
py -3 --version >nul 2>nul && goto ok
python --version >nul 2>nul && goto ok
echo  O Python nao esta instalado. Tentando instalar automaticamente...
echo  (se aparecer uma janela pedindo confirmacao, clique em SIM)
echo.
winget --version >nul 2>nul || goto manual
winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements
echo.
echo  Terminou. Feche esta janela e abra "2 - INICIAR SERVIDOR.bat".
pause
exit /b
:manual
echo  Nao foi possivel instalar automaticamente. Vou abrir o site do Python.
echo  IMPORTANTE: na primeira tela do instalador, MARQUE "Add python.exe to PATH".
start https://www.python.org/downloads/windows/
pause
exit /b
:ok
echo  O Python ja esta instalado. Abra "2 - INICIAR SERVIDOR.bat".
echo.
pause
