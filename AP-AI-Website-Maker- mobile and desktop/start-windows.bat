@echo off
cd /d "%~dp0backend"
if not exist node_modules call npm install
call npm start
pause
