# POS SaaS v2 — Plataforma Omnicanal

## Inicio rapido

### Prerrequisitos
- Docker Desktop instalado y corriendo
- Puertos 3000-3010, 5432, 6379, 4222 libres

### 1. Levantar todo
```bash
docker compose up --build
```
Primera vez tarda ~5 minutos instalando dependencias.

### 2. Ejecutar seed (datos de prueba)
Una vez que todos los servicios esten corriendo:
```bash
node seed.js
# Windows:
seed.bat
```

### 3. Abrir la aplicacion
- **Frontend POS**: http://localhost:3010
- **API Docs**: http://localhost:3000/docs

### Usuarios de prueba
| Email | Password | Rol |
|-------|----------|-----|
| admin@demo.com | password123 | Admin |
| cajero@demo.com | password123 | Cajero |
| mesero@demo.com | password123 | Mesero |
| cocina@demo.com | password123 | Cocina |
| dueno@demo.com | password123 | Viewer |

## Servicios
| Servicio | Puerto |
|---------|--------|
| API Gateway | 3000 |
| Auth | 3001 |
| Users | 3002 |
| Products | 3003 |
| Orders | 3004 |
| Inventory | 3005 |
| Payments | 3006 |
| Kitchen | 3007 |
| Notifications | 3008 |
| Analytics | 3009 |
| Frontend | 3010 |

## Comandos utiles
```bash
# Ver logs de un servicio
docker logs pos_product -f

# Reiniciar un servicio
docker compose restart product-service

# Parar todo
docker compose down

# Borrar todo incluido datos
docker compose down -v
```
