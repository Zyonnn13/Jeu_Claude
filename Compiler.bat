@echo off
setlocal
cd /d "%~dp0"
title Nuit Eternelle - compilation
rem Recompile le jeu apres une modification du code, des sprites PNG ou de l'equilibrage.
if not exist "node_modules" call npm install
call npm run build
if errorlevel 1 (
  echo La compilation a echoue.
) else (
  echo Compilation terminee : lancez Jouer.bat
  if exist "release\NuitEternelle.exe" echo Jouer.bat lance release\NuitEternelle.exe : relancez Creer-exe.bat pour y inclure ces changements.
)
pause
