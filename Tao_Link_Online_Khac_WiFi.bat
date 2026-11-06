@echo off
title Link Online Tien Len Mien Nam (Choi Xuyen Mang / Khac WiFi / 4G)
cd /d "%~dp0"
echo =====================================================================
echo   DANG TAO LINK PUBLIC HTTPS DE CHOI KHAC WIFI / 4G VOI BAN BE...
echo   Hay copy duong link https://....lhr.life ben duoi gui cho ban be!
echo =====================================================================
ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:8080 nokey@localhost.run
pause
