@echo off
echo ============================================================
echo  POS SaaS v2 - Instalando dependencias en todos los servicios
echo ============================================================
echo.
echo Esto puede tomar varios minutos la primera vez...
echo.

call npm --prefix services/api-gateway      install
call npm --prefix services/auth-service     install
call npm --prefix services/user-service     install
call npm --prefix services/product-service  install
call npm --prefix services/order-service    install
call npm --prefix services/inventory-service install
call npm --prefix services/payment-service  install
call npm --prefix services/kitchen-service  install
call npm --prefix services/notification-service install
call npm --prefix services/analytics-service install
call npm --prefix frontend                  install
call npm install

echo.
echo ============================================================
echo  Todas las dependencias instaladas. Ya puedes correr dev.bat
echo ============================================================
pause
