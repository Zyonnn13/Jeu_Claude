@echo off
setlocal
cd /d "%~dp0"
title Nuit Eternelle

rem Premier lancement : compilation du jeu (apres une modification du code, utilisez Compiler.bat).
if not exist "dist\index.html" (
  echo Preparation du jeu, merci de patienter...
  where npm >nul 2>nul
  if errorlevel 1 (
    echo Node.js est necessaire pour compiler le jeu : https://nodejs.org
    pause
    exit /b 1
  )
  if not exist "node_modules" call npm install
  call npm run build
  if errorlevel 1 (
    echo La compilation a echoue.
    pause
    exit /b 1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\launch.ps1"
