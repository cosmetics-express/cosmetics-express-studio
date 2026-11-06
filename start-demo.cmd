@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS from https://nodejs.org/en/download first.
  echo Then reopen this file.
  pause
  exit /b 1
)
node scripts\start-demo.mjs
if errorlevel 1 pause
