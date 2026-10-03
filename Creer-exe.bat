@echo off
setlocal
cd /d "%~dp0"
title Nuit Eternelle - creation de l'exe
rem Cree release\NuitEternelle.exe : le jeu complet en un seul fichier, qui se lance sans Node.js ni navigateur.
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js est necessaire pour creer l'exe : https://nodejs.org
  pause
  exit /b 1
)
rem node_modules peut dater d'avant l'ajout d'Electron : on verifie la presence d'electron-builder.
if not exist "node_modules\electron-builder" call npm install
rem Un jeu ouvert verrouille ses fichiers : la creation attendrait sans fin.
tasklist /FI "IMAGENAME eq Nuit Eternelle.exe" 2>nul | find /I "Nuit Eternelle.exe" >nul
if not errorlevel 1 (
  echo Le jeu est ouvert : fermez-le avant de recreer l'exe.
  pause
  exit /b 1
)
echo Creation de l'exe, merci de patienter (plusieurs minutes la premiere fois)...
call npm run exe
if errorlevel 1 (
  echo La creation de l'exe a echoue.
) else (
  echo Termine : l'exe se trouve dans release\NuitEternelle.exe
  echo Ce fichier suffit pour jouer : il peut etre copie sur un autre PC.
  echo Jouer.bat lance directement la version deja decompressee, dans release\win-unpacked.
)
pause
