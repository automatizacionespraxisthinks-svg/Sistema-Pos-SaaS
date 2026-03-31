@echo off
echo ============================================================
echo  POS SaaS v2 - Entorno de Desarrollo Local
echo ============================================================
echo.

:: 1. Verificar Docker
docker info >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Docker no esta corriendo. Abrelo e intenta de nuevo.
  pause
  exit /b 1
)

:: 2. Levantar infraestructura
echo [1/3] Levantando infraestructura (Postgres, Redis, NATS)...
docker-compose up postgres redis nats -d
if errorlevel 1 (
  echo [ERROR] Fallo al levantar la infraestructura.
  pause
  exit /b 1
)
echo       Infraestructura lista.
echo.

:: 3. Instalar dependencias si node_modules no existe
echo [2/3] Verificando dependencias raiz...
if not exist "node_modules" (
  echo       Instalando concurrently...
  npm install
)
echo       Dependencias listas.
echo.

:: 4. Iniciar todos los servicios con hot-reload
echo [3/3] Iniciando todos los servicios con hot-reload...
echo       (Ctrl+C para detener todo)
echo.
npm run dev

pause
