@echo off
title Server Tien Len Mien Nam WiFi
cd /d "%~dp0"
start "" "http://localhost:8080"
TienLenServer.exe 8080
pause
