@echo off
cd /d "%~dp0web"
echo Gestion Esencial - Vista local
echo Abre http://127.0.0.1:4321 en tu navegador.
echo Deja esta ventana abierta. Para detener, presiona Ctrl+C.
call npm run dev
pause
