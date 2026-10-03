# Ouvre le jeu dans une fenêtre dédiée (Microsoft Edge en mode application, sans barre d'adresse).
$ErrorActionPreference = 'Stop'
$game = Resolve-Path (Join-Path $PSScriptRoot '..\dist\index.html')
$uri = ([System.Uri]$game.Path).AbsoluteUri

$candidates = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)
$edge = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if ($edge) {
  Start-Process -FilePath $edge -ArgumentList @("--app=$uri", '--window-size=1280,800')
} else {
  # Pas d'Edge : on ouvre le jeu dans le navigateur par défaut.
  Start-Process $uri
}
