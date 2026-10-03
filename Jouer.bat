@echo off
setlocal
cd /d "%~dp0"
title Nuit Eternelle

rem Si l'exe a ete cree (Creer-exe.bat), on lance sa version deja decompressee : demarrage immediat.
if exist "release\win-unpacked\resources\app.asar" if exist "release\win-unpacked\Nuit Eternelle.exe" (
  start "" "release\win-unpacked\Nuit Eternelle.exe"
  exit /b 0
)
if exist "release\NuitEternelle.exe" (
  start "" "release\NuitEternelle.exe"
  exit /b 0
)

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
