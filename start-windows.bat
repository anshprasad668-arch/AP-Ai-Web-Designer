@echo off
title AP AI Website Maker
cd /d "%~dp0"
if not exist node_modules (
  echo Dependencies are missing. Run: npm install
  pause
  exit /b 1
)
if not exist .env (
  echo Missing .env file. Copy .env.example to .env and add your Gemini API key.
  pause
  exit /b 1
)
echo Starting AP AI Website Maker...
npm start
pause
