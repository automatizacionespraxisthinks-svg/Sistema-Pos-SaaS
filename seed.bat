@echo off
set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%
echo.
echo Ejecutando seed de datos...
echo Asegurate de que los servicios esten corriendo.
echo.
node "%ROOT%\seed.js"
echo.
pause
