#!/bin/bash
# =============================================================================
# POS SaaS v2 — Script de datos de prueba integrales
# =============================================================================
# Ejecución (desde la máquina host, con Docker corriendo):
#   docker exec -i pos_postgres bash < infra/seed/seed.sh
# =============================================================================
set -e

PU="pos_user"
PP="pos_password"
RUN() { PGPASSWORD="$PP" psql -U "$PU" -d "$1" -v ON_ERROR_STOP=1 -q; }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " POS SaaS v2 — Cargando datos de prueba"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. OBTENER TENANT ID ──────────────────────────────────────────────────────
TENANT_ID=$(PGPASSWORD="$PP" psql -U "$PU" -d pos_auth -t -A \
  -c "SELECT id FROM tenants LIMIT 1;")

if [ -z "$TENANT_ID" ]; then
  echo "ERROR: No se encontró ningún tenant. Registra primero el restaurante."
  exit 1
fi
echo "✓ Tenant: $TENANT_ID"

# ── 2. PRODUCTOS: categorías + productos ──────────────────────────────────────
echo "→ Insertando categorías y productos..."
RUN pos_products << EOSQL

-- Limpiar datos previos de seed (por si se ejecuta más de una vez)
DELETE FROM products WHERE sku LIKE 'SEED-%';
DELETE FROM categories WHERE name IN (
  'Entradas','Sopas','Platos Fuertes','Bebidas','Jugos Naturales',
  'Postres','Cócteles','Especiales del día'
);

-- Categorías
INSERT INTO categories (id,"tenantId",name,description,"sortOrder","isActive","createdAt","updatedAt") VALUES
  ('c1000001-0000-0000-0000-000000000001','$TENANT_ID','Entradas','Aperitivos y entradas',1,true,NOW(),NOW()),
  ('c1000001-0000-0000-0000-000000000002','$TENANT_ID','Sopas','Sopas y caldos del día',2,true,NOW(),NOW()),
  ('c1000001-0000-0000-0000-000000000003','$TENANT_ID','Platos Fuertes','Platos principales',3,true,NOW(),NOW()),
  ('c1000001-0000-0000-0000-000000000004','$TENANT_ID','Bebidas','Bebidas frías y calientes',4,true,NOW(),NOW()),
  ('c1000001-0000-0000-0000-000000000005','$TENANT_ID','Jugos Naturales','Jugos frescos del día',5,true,NOW(),NOW()),
  ('c1000001-0000-0000-0000-000000000006','$TENANT_ID','Postres','Dulces y postres',6,true,NOW(),NOW()),
  ('c1000001-0000-0000-0000-000000000007','$TENANT_ID','Cócteles','Bebidas con y sin alcohol',7,true,NOW(),NOW()),
  ('c1000001-0000-0000-0000-000000000008','$TENANT_ID','Especiales del día','Platos especiales rotativos',8,true,NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

-- Productos
INSERT INTO products (id,"tenantId","categoryId",name,description,price,"costPrice",sku,status,"imageUrl","createdAt","updatedAt") VALUES
-- ENTRADAS
('p100-0001-0000-0000-000000000001','$TENANT_ID','c1000001-0000-0000-0000-000000000001','Tabla de Quesos','Selección de quesos artesanales con mermelada y frutos secos',28000,12000,'SEED-ENT-001','active',NULL,NOW(),NOW()),
('p100-0001-0000-0000-000000000002','$TENANT_ID','c1000001-0000-0000-0000-000000000001','Camarones al Ajillo','Camarones salteados en mantequilla y ajo con pan artesanal',35000,15000,'SEED-ENT-002','active',NULL,NOW(),NOW()),
('p100-0001-0000-0000-000000000003','$TENANT_ID','c1000001-0000-0000-0000-000000000001','Empanadas x3','Empanadas de pipián con ají y hogao',15000,5000,'SEED-ENT-003','active',NULL,NOW(),NOW()),
('p100-0001-0000-0000-000000000004','$TENANT_ID','c1000001-0000-0000-0000-000000000001','Patacones con Guacamole','Patacones crujientes con guacamole fresco y suero costeño',18000,6000,'SEED-ENT-004','active',NULL,NOW(),NOW()),
-- SOPAS
('p100-0002-0000-0000-000000000001','$TENANT_ID','c1000001-0000-0000-0000-000000000002','Sancocho Trifásico','Sancocho con pollo, cerdo y res con papa, yuca y mazorca',22000,7000,'SEED-SOP-001','active',NULL,NOW(),NOW()),
('p100-0002-0000-0000-000000000002','$TENANT_ID','c1000001-0000-0000-0000-000000000002','Ajiaco Bogotano','Ajiaco tradicional con pollo, tres tipos de papa y guascas',24000,8000,'SEED-SOP-002','active',NULL,NOW(),NOW()),
('p100-0002-0000-0000-000000000003','$TENANT_ID','c1000001-0000-0000-0000-000000000002','Sopa del Día','Preparación especial del chef según temporada',18000,5500,'SEED-SOP-003','active',NULL,NOW(),NOW()),
-- PLATOS FUERTES
('p100-0003-0000-0000-000000000001','$TENANT_ID','c1000001-0000-0000-0000-000000000003','Bandeja Paisa','Frijoles, arroz, carne molida, chicharrón, huevo, chorizo y aguacate',42000,16000,'SEED-PLF-001','active',NULL,NOW(),NOW()),
('p100-0003-0000-0000-000000000002','$TENANT_ID','c1000001-0000-0000-0000-000000000003','Churrasco 300g','Churrasco de res a la parrilla con papas rústicas y ensalada',55000,22000,'SEED-PLF-002','active',NULL,NOW(),NOW()),
('p100-0003-0000-0000-000000000003','$TENANT_ID','c1000001-0000-0000-0000-000000000003','Pollo a la Plancha','Pechuga de pollo a la plancha con arroz, ensalada y maduro',32000,11000,'SEED-PLF-003','active',NULL,NOW(),NOW()),
('p100-0003-0000-0000-000000000004','$TENANT_ID','c1000001-0000-0000-0000-000000000003','Trucha al Horno','Trucha entera al horno con papas al vapor y vegetales',48000,19000,'SEED-PLF-004','active',NULL,NOW(),NOW()),
('p100-0003-0000-0000-000000000005','$TENANT_ID','c1000001-0000-0000-0000-000000000003','Costillas BBQ','Rack de costillas con salsa BBQ ahumada, maíz y papas fritas',52000,21000,'SEED-PLF-005','active',NULL,NOW(),NOW()),
('p100-0003-0000-0000-000000000006','$TENANT_ID','c1000001-0000-0000-0000-000000000003','Lomo al Trapo','Lomo de res sellado en sal y especias, servido con risotto',65000,26000,'SEED-PLF-006','active',NULL,NOW(),NOW()),
-- BEBIDAS
('p100-0004-0000-0000-000000000001','$TENANT_ID','c1000001-0000-0000-0000-000000000004','Agua Mineral 500ml','Agua mineral natural o con gas',4000,1200,'SEED-BEB-001','active',NULL,NOW(),NOW()),
('p100-0004-0000-0000-000000000002','$TENANT_ID','c1000001-0000-0000-0000-000000000004','Gaseosa 350ml','Coca-Cola, Pepsi o Sprite',6000,2000,'SEED-BEB-002','active',NULL,NOW(),NOW()),
('p100-0004-0000-0000-000000000003','$TENANT_ID','c1000001-0000-0000-0000-000000000004','Cerveza Nacional','Cerveza fría de 330ml',8000,3000,'SEED-BEB-003','active',NULL,NOW(),NOW()),
('p100-0004-0000-0000-000000000004','$TENANT_ID','c1000001-0000-0000-0000-000000000004','Café Americano','Café de origen con agua filtrada',7000,1500,'SEED-BEB-004','active',NULL,NOW(),NOW()),
-- JUGOS
('p100-0005-0000-0000-000000000001','$TENANT_ID','c1000001-0000-0000-0000-000000000005','Jugo de Naranja','Jugo natural de naranja en agua o en leche',9000,2500,'SEED-JUG-001','active',NULL,NOW(),NOW()),
('p100-0005-0000-0000-000000000002','$TENANT_ID','c1000001-0000-0000-0000-000000000005','Jugo de Mora','Jugo natural de mora en agua o en leche',9000,2500,'SEED-JUG-002','active',NULL,NOW(),NOW()),
('p100-0005-0000-0000-000000000003','$TENANT_ID','c1000001-0000-0000-0000-000000000005','Jugo de Maracuyá','Jugo natural de maracuyá con toques de limón',10000,3000,'SEED-JUG-003','active',NULL,NOW(),NOW()),
('p100-0005-0000-0000-000000000004','$TENANT_ID','c1000001-0000-0000-0000-000000000005','Jugo de Lulo','Jugo natural de lulo en agua',10000,3000,'SEED-JUG-004','active',NULL,NOW(),NOW()),
-- POSTRES
('p100-0006-0000-0000-000000000001','$TENANT_ID','c1000001-0000-0000-0000-000000000006','Flan de Caramelo','Flan artesanal de vainilla con coulis de caramelo',14000,4500,'SEED-POS-001','active',NULL,NOW(),NOW()),
('p100-0006-0000-0000-000000000002','$TENANT_ID','c1000001-0000-0000-0000-000000000006','Brownie con Helado','Brownie tibio de chocolate con bola de helado de vainilla',16000,5500,'SEED-POS-002','active',NULL,NOW(),NOW()),
('p100-0006-0000-0000-000000000003','$TENANT_ID','c1000001-0000-0000-0000-000000000006','Arroz con Leche','Arroz con leche cremoso con canela y pasas',12000,3500,'SEED-POS-003','active',NULL,NOW(),NOW()),
-- CÓCTELES
('p100-0007-0000-0000-000000000001','$TENANT_ID','c1000001-0000-0000-0000-000000000007','Limonada de Coco','Limonada frozen con crema de coco y hierbabuena',14000,4000,'SEED-COC-001','active',NULL,NOW(),NOW()),
('p100-0007-0000-0000-000000000002','$TENANT_ID','c1000001-0000-0000-0000-000000000007','Michelada','Cerveza con limón, sal, salsa negra y chile',15000,4500,'SEED-COC-002','active',NULL,NOW(),NOW()),
-- ESPECIALES
('p100-0008-0000-0000-000000000001','$TENANT_ID','c1000001-0000-0000-0000-000000000008','Menú Ejecutivo','Sopa + plato fuerte + jugo + postre del día',38000,14000,'SEED-ESP-001','active',NULL,NOW(),NOW()),
('p100-0008-0000-0000-000000000002','$TENANT_ID','c1000001-0000-0000-0000-000000000008','Parrillada para 2','Surtido de carnes a la parrilla para compartir',95000,38000,'SEED-ESP-002','active',NULL,NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

EOSQL

echo "✓ Categorías y productos"

# ── 3. INVENTARIO: ítems + recetas ────────────────────────────────────────────
echo "→ Insertando inventario y recetas..."
RUN pos_inventory << EOSQL

-- Inventario base (ingredientes y materias primas)
INSERT INTO inventory (id,"tenantId","productId","productName",quantity,"minStock",unit,location,"createdAt","updatedAt") VALUES
('inv00001-0000-0000-0000-000000000001','$TENANT_ID','ing-0001','Pechuga de pollo (kg)',45,10,'Kilogramos','Refrigerador 1',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000002','$TENANT_ID','ing-0002','Lomo de res (kg)',30,8,'Kilogramos','Refrigerador 1',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000003','$TENANT_ID','ing-0003','Costillas de cerdo (kg)',25,6,'Kilogramos','Refrigerador 1',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000004','$TENANT_ID','ing-0004','Camarones (kg)',8,3,'Kilogramos','Refrigerador 2',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000005','$TENANT_ID','ing-0005','Trucha entera (unid)',12,4,'Unidades','Refrigerador 2',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000006','$TENANT_ID','ing-0006','Papa pastusa (kg)',80,20,'Kilogramos','Bodega seca',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000007','$TENANT_ID','ing-0007','Arroz (kg)',60,15,'Kilogramos','Bodega seca',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000008','$TENANT_ID','ing-0008','Fríjoles (kg)',25,8,'Kilogramos','Bodega seca',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000009','$TENANT_ID','ing-0009','Harina de trigo (kg)',30,10,'Kilogramos','Bodega seca',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000010','$TENANT_ID','ing-0010','Aceite vegetal (litros)',20,5,'Litros','Bodega seca',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000011','$TENANT_ID','ing-0011','Cebolla cabezona (kg)',15,5,'Kilogramos','Bodega fresca',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000012','$TENANT_ID','ing-0012','Tomate chonto (kg)',12,4,'Kilogramos','Bodega fresca',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000013','$TENANT_ID','ing-0013','Aguacate (unid)',20,6,'Unidades','Bodega fresca',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000014','$TENANT_ID','ing-0014','Leche entera (litros)',15,4,'Litros','Refrigerador 2',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000015','$TENANT_ID','ing-0015','Huevos (unid)',48,12,'Unidades','Refrigerador 2',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000016','$TENANT_ID','ing-0016','Cerveza (cajas x24)',8,3,'Cajas',NULL,NOW(),NOW()),
('inv00001-0000-0000-0000-000000000017','$TENANT_ID','ing-0017','Gaseosa (cajas x12)',6,2,'Cajas',NULL,NOW(),NOW()),
('inv00001-0000-0000-0000-000000000018','$TENANT_ID','ing-0018','Naranja (kg)',18,6,'Kilogramos','Bodega fresca',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000019','$TENANT_ID','ing-0019','Limón (kg)',10,3,'Kilogramos','Bodega fresca',NOW(),NOW()),
('inv00001-0000-0000-0000-000000000020','$TENANT_ID','ing-0020','Chocolate amargo (kg)',5,2,'Kilogramos','Bodega seca',NOW(),NOW())
ON CONFLICT (id) DO NOTHING;

-- Recetas de productos
INSERT INTO recipes (id,"tenantId","productId","productName",ingredients,"createdAt","updatedAt") VALUES
(
  'rec00001-0000-0000-0000-000000000001','$TENANT_ID',
  'p100-0003-0000-0000-000000000001','Bandeja Paisa',
  '[
    {"ingredientId":"ing-0008","ingredientName":"Fríjoles (kg)","quantity":0.15,"unit":"Kilogramos"},
    {"ingredientId":"ing-0007","ingredientName":"Arroz (kg)","quantity":0.12,"unit":"Kilogramos"},
    {"ingredientId":"ing-0002","ingredientName":"Lomo de res (kg)","quantity":0.15,"unit":"Kilogramos"},
    {"ingredientId":"ing-0015","ingredientName":"Huevos (unid)","quantity":1,"unit":"Unidades"},
    {"ingredientId":"ing-0013","ingredientName":"Aguacate (unid)","quantity":0.5,"unit":"Unidades"}
  ]'::jsonb,
  NOW(),NOW()
),
(
  'rec00001-0000-0000-0000-000000000002','$TENANT_ID',
  'p100-0003-0000-0000-000000000002','Churrasco 300g',
  '[
    {"ingredientId":"ing-0002","ingredientName":"Lomo de res (kg)","quantity":0.3,"unit":"Kilogramos"},
    {"ingredientId":"ing-0006","ingredientName":"Papa pastusa (kg)","quantity":0.2,"unit":"Kilogramos"},
    {"ingredientId":"ing-0011","ingredientName":"Cebolla cabezona (kg)","quantity":0.05,"unit":"Kilogramos"}
  ]'::jsonb,
  NOW(),NOW()
),
(
  'rec00001-0000-0000-0000-000000000003','$TENANT_ID',
  'p100-0003-0000-0000-000000000003','Pollo a la Plancha',
  '[
    {"ingredientId":"ing-0001","ingredientName":"Pechuga de pollo (kg)","quantity":0.25,"unit":"Kilogramos"},
    {"ingredientId":"ing-0007","ingredientName":"Arroz (kg)","quantity":0.1,"unit":"Kilogramos"},
    {"ingredientId":"ing-0010","ingredientName":"Aceite vegetal (litros)","quantity":0.02,"unit":"Litros"}
  ]'::jsonb,
  NOW(),NOW()
),
(
  'rec00001-0000-0000-0000-000000000004','$TENANT_ID',
  'p100-0002-0000-0000-000000000001','Sancocho Trifásico',
  '[
    {"ingredientId":"ing-0001","ingredientName":"Pechuga de pollo (kg)","quantity":0.2,"unit":"Kilogramos"},
    {"ingredientId":"ing-0006","ingredientName":"Papa pastusa (kg)","quantity":0.25,"unit":"Kilogramos"},
    {"ingredientId":"ing-0011","ingredientName":"Cebolla cabezona (kg)","quantity":0.05,"unit":"Kilogramos"},
    {"ingredientId":"ing-0012","ingredientName":"Tomate chonto (kg)","quantity":0.05,"unit":"Kilogramos"}
  ]'::jsonb,
  NOW(),NOW()
),
(
  'rec00001-0000-0000-0000-000000000005','$TENANT_ID',
  'p100-0003-0000-0000-000000000004','Trucha al Horno',
  '[
    {"ingredientId":"ing-0005","ingredientName":"Trucha entera (unid)","quantity":1,"unit":"Unidades"},
    {"ingredientId":"ing-0006","ingredientName":"Papa pastusa (kg)","quantity":0.15,"unit":"Kilogramos"},
    {"ingredientId":"ing-0019","ingredientName":"Limón (kg)","quantity":0.05,"unit":"Kilogramos"}
  ]'::jsonb,
  NOW(),NOW()
),
(
  'rec00001-0000-0000-0000-000000000006','$TENANT_ID',
  'p100-0001-0000-0000-000000000002','Camarones al Ajillo',
  '[
    {"ingredientId":"ing-0004","ingredientName":"Camarones (kg)","quantity":0.2,"unit":"Kilogramos"},
    {"ingredientId":"ing-0010","ingredientName":"Aceite vegetal (litros)","quantity":0.03,"unit":"Litros"},
    {"ingredientId":"ing-0019","ingredientName":"Limón (kg)","quantity":0.03,"unit":"Kilogramos"}
  ]'::jsonb,
  NOW(),NOW()
),
(
  'rec00001-0000-0000-0000-000000000007','$TENANT_ID',
  'p100-0006-0000-0000-000000000002','Brownie con Helado',
  '[
    {"ingredientId":"ing-0020","ingredientName":"Chocolate amargo (kg)","quantity":0.08,"unit":"Kilogramos"},
    {"ingredientId":"ing-0009","ingredientName":"Harina de trigo (kg)","quantity":0.06,"unit":"Kilogramos"},
    {"ingredientId":"ing-0015","ingredientName":"Huevos (unid)","quantity":2,"unit":"Unidades"},
    {"ingredientId":"ing-0014","ingredientName":"Leche entera (litros)","quantity":0.05,"unit":"Litros"}
  ]'::jsonb,
  NOW(),NOW()
)
ON CONFLICT (id) DO NOTHING;

EOSQL

echo "✓ Inventario y recetas"

# ── 4. PEDIDOS + ITEMS (últimos 30 días con variación) ────────────────────────
echo "→ Generando pedidos de los últimos 30 días..."
RUN pos_orders << EOSQL

DO \$\$
DECLARE
  v_tenant   TEXT := '$TENANT_ID';
  v_day      INT;
  v_date     TIMESTAMP;
  v_orders   INT;
  v_ord_idx  INT;
  v_ord_id   UUID;
  v_ord_num  TEXT;
  v_type     TEXT;
  v_status   TEXT;
  v_subtotal NUMERIC;
  v_tax      NUMERIC;
  v_total    NUMERIC;
  v_item_count INT;
  v_item_idx INT;
  v_prod_id  TEXT;
  v_prod_name TEXT;
  v_price    NUMERIC;
  v_qty      INT;
  v_table_n  TEXT;
  v_waiter   TEXT;

  -- Catálogo de productos para seed
  products TEXT[][] := ARRAY[
    ARRAY['p100-0001-0000-0000-000000000001','Tabla de Quesos','28000'],
    ARRAY['p100-0001-0000-0000-000000000002','Camarones al Ajillo','35000'],
    ARRAY['p100-0001-0000-0000-000000000003','Empanadas x3','15000'],
    ARRAY['p100-0001-0000-0000-000000000004','Patacones con Guacamole','18000'],
    ARRAY['p100-0002-0000-0000-000000000001','Sancocho Trifásico','22000'],
    ARRAY['p100-0002-0000-0000-000000000002','Ajiaco Bogotano','24000'],
    ARRAY['p100-0003-0000-0000-000000000001','Bandeja Paisa','42000'],
    ARRAY['p100-0003-0000-0000-000000000002','Churrasco 300g','55000'],
    ARRAY['p100-0003-0000-0000-000000000003','Pollo a la Plancha','32000'],
    ARRAY['p100-0003-0000-0000-000000000004','Trucha al Horno','48000'],
    ARRAY['p100-0003-0000-0000-000000000005','Costillas BBQ','52000'],
    ARRAY['p100-0004-0000-0000-000000000001','Agua Mineral 500ml','4000'],
    ARRAY['p100-0004-0000-0000-000000000002','Gaseosa 350ml','6000'],
    ARRAY['p100-0004-0000-0000-000000000003','Cerveza Nacional','8000'],
    ARRAY['p100-0005-0000-0000-000000000001','Jugo de Naranja','9000'],
    ARRAY['p100-0005-0000-0000-000000000003','Jugo de Maracuyá','10000'],
    ARRAY['p100-0006-0000-0000-000000000002','Brownie con Helado','16000'],
    ARRAY['p100-0007-0000-0000-000000000001','Limonada de Coco','14000'],
    ARRAY['p100-0008-0000-0000-000000000001','Menú Ejecutivo','38000']
  ];

  waiters TEXT[] := ARRAY['Carlos Méndez','Laura Gómez','Andrés Torres','María Ruiz'];
  ord_counter INT := 5000;

BEGIN
  -- Limpiar pedidos de seed anteriores
  DELETE FROM order_items WHERE "orderId" IN (
    SELECT id FROM orders WHERE "tenantId" = v_tenant
      AND "orderNumber" LIKE 'ORD-SEED-%'
  );
  DELETE FROM orders WHERE "tenantId" = v_tenant
    AND "orderNumber" LIKE 'ORD-SEED-%';

  FOR v_day IN 0..29 LOOP
    v_date := (NOW() - (v_day || ' days')::INTERVAL)::DATE + '12:00:00'::TIME;

    -- Más pedidos entre semana, menos en lunes
    v_orders := CASE
      WHEN EXTRACT(DOW FROM v_date) = 1 THEN 6 + FLOOR(RANDOM()*4)::INT   -- lunes
      WHEN EXTRACT(DOW FROM v_date) IN (0,6) THEN 14 + FLOOR(RANDOM()*6)::INT -- fines
      ELSE 9 + FLOOR(RANDOM()*6)::INT
    END;

    FOR v_ord_idx IN 1..v_orders LOOP
      v_ord_id  := gen_random_uuid();
      ord_counter := ord_counter + 1;
      v_ord_num := 'ORD-SEED-' || TO_CHAR(v_date,'YYYYMMDD') || '-' || LPAD(v_ord_idx::TEXT,3,'0');

      -- Tipo de pedido
      v_type := CASE WHEN RANDOM() < 0.72 THEN 'dine_in' ELSE 'takeout' END;

      -- Estado (80% pagado, 12% cancelado, 8% otros)
      v_status := CASE
        WHEN RANDOM() < 0.80 THEN 'paid'
        WHEN RANDOM() < 0.60 THEN 'cancelled'
        ELSE 'delivered'
      END;
      -- Hoy y ayer: algunos aún pendientes
      IF v_day <= 1 AND RANDOM() < 0.25 THEN
        v_status := CASE WHEN RANDOM() < 0.5 THEN 'confirmed' ELSE 'ready' END;
      END IF;

      -- Mesa y mesero (solo dine_in)
      IF v_type = 'dine_in' THEN
        v_table_n := (1 + FLOOR(RANDOM()*12))::TEXT;
        v_waiter  := waiters[1 + FLOOR(RANDOM()*4)::INT];
      ELSE
        v_table_n := NULL;
        v_waiter  := NULL;
      END IF;

      -- Número de ítems por pedido (1-4)
      v_item_count := 1 + FLOOR(RANDOM()*3)::INT;
      v_subtotal := 0;

      INSERT INTO orders (
        id,"tenantId","orderNumber",type,status,"paymentStatus",
        "tableNumber","waiterName",subtotal,tax,discount,total,
        notes,"cancelReason","createdAt","updatedAt"
      ) VALUES (
        v_ord_id, v_tenant, v_ord_num, v_type, v_status,
        CASE WHEN v_status = 'paid' THEN 'paid' ELSE 'pending' END,
        v_table_n, v_waiter,
        0, 0, 0, 0,  -- se actualizan abajo
        NULL,
        CASE WHEN v_status = 'cancelled' THEN
          (ARRAY['Cliente no se presentó','Error en pedido','Cocina cerrada','Solicitud del cliente'])[1+FLOOR(RANDOM()*4)::INT]
        ELSE NULL END,
        v_date + ((v_ord_idx * 3 + FLOOR(RANDOM()*20)) || ' minutes')::INTERVAL,
        v_date + ((v_ord_idx * 3 + FLOOR(RANDOM()*20)) || ' minutes')::INTERVAL
      );

      -- Ítems del pedido
      FOR v_item_idx IN 1..v_item_count LOOP
        v_prod_id   := products[1 + FLOOR(RANDOM()*19)::INT][1];
        v_prod_name := products[1 + FLOOR(RANDOM()*19)::INT][2];
        v_price     := products[1 + FLOOR(RANDOM()*19)::INT][3]::NUMERIC;
        v_qty       := 1 + FLOOR(RANDOM()*2)::INT;

        -- Elegir producto consistentemente
        DECLARE v_pidx INT := 1 + FLOOR(RANDOM()*19)::INT;
        BEGIN
          v_prod_id   := products[v_pidx][1];
          v_prod_name := products[v_pidx][2];
          v_price     := products[v_pidx][3]::NUMERIC;
        END;

        v_subtotal := v_subtotal + (v_price * v_qty);

        INSERT INTO order_items (
          id,"orderId","productId","productName","unitPrice",quantity,subtotal,notes,"isVoided"
        ) VALUES (
          gen_random_uuid(), v_ord_id,
          v_prod_id, v_prod_name, v_price, v_qty, v_price * v_qty,
          NULL, false
        );
      END LOOP;

      v_tax   := ROUND(v_subtotal * 0.19);
      v_total := v_subtotal + v_tax;

      UPDATE orders SET subtotal=v_subtotal, tax=v_tax, total=v_total
      WHERE id=v_ord_id;

    END LOOP;
  END LOOP;
END \$\$;

EOSQL

echo "✓ Pedidos de 30 días"

# ── 5. PAGOS + TURNOS DE CAJA ─────────────────────────────────────────────────
echo "→ Generando pagos y turnos de caja..."
RUN pos_payments << EOSQL

DO \$\$
DECLARE
  v_tenant   TEXT := '$TENANT_ID';
  v_cashier_id TEXT := '00000000-0000-0000-0000-000000000000';
  v_day      INT;
  v_date     DATE;
  v_shift_id UUID;
  v_cash     NUMERIC := 0;
  v_card     NUMERIC := 0;
  v_trans    NUMERIC := 0;
  v_tips     NUMERIC := 0;
  v_method   TEXT;
  v_tip      NUMERIC;
  rec        RECORD;
BEGIN
  -- Limpiar pagos y turnos de seed previos
  DELETE FROM payments  WHERE "tenantId" = v_tenant AND notes LIKE 'seed-%';
  DELETE FROM cash_shifts WHERE "tenantId" = v_tenant AND notes LIKE 'seed-%';

  -- Intentar obtener un cashier real
  BEGIN
    SELECT id::TEXT INTO v_cashier_id
    FROM users
    WHERE role IN ('cashier','admin','super_admin')
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- dejamos el placeholder
  END;

  FOR v_day IN 0..29 LOOP
    v_date := (NOW() - (v_day || ' days')::INTERVAL)::DATE;

    -- Crear turno del día
    v_shift_id := gen_random_uuid();
    v_cash := 0; v_card := 0; v_trans := 0; v_tips := 0;

    INSERT INTO cash_shifts (
      id,"tenantId","cashierId","cashierName","initialCash",
      "cashSales","cardSales","transferSales","totalTips",
      "countedCash","expectedCash",discrepancy,
      status,notes,"openedAt","closedAt","updatedAt"
    ) VALUES (
      v_shift_id, v_tenant, v_cashier_id, 'Caja Principal', 150000,
      0,0,0,0,NULL,NULL,NULL,
      CASE WHEN v_day = 0 THEN 'open' ELSE 'closed' END,
      'seed-turno-' || v_date,
      (v_date + '08:00:00'::TIME)::TIMESTAMP,
      CASE WHEN v_day = 0 THEN NULL ELSE (v_date + '21:30:00'::TIME)::TIMESTAMP END,
      NOW()
    );

    -- Registrar pagos para cada orden pagada de ese día (aproximado)
    FOR v_day IN 0..0 LOOP -- dummy loop, usamos el FOR rec
      NULL;
    END LOOP;

  END LOOP;
END \$\$;

EOSQL

# Generar pagos usando los pedidos reales de la base de órdenes
# Esto requiere consultar pos_orders desde pos_payments — no posible directamente
# Se usa un script separado que conecta a ambas bases en secuencia

echo "→ Enlazando pagos con pedidos..."

# Obtener IDs de órdenes pagadas y crear pagos
PGPASSWORD="$PP" psql -U "$PU" -d pos_orders -t -A -F'|' \
  -c "SELECT id,total,\"tenantId\",\"waiterName\",\"createdAt\"
      FROM orders
      WHERE \"tenantId\"='$TENANT_ID'
        AND status='paid'
        AND \"orderNumber\" LIKE 'ORD-SEED-%'
      ORDER BY \"createdAt\";" | \
while IFS='|' read -r ord_id total tenant_id waiter_name created_at; do
  [ -z "$ord_id" ] && continue
  # Método aleatorio
  r=$RANDOM
  if   [ $((r % 10)) -lt 6 ]; then method="cash"
  elif [ $((r % 10)) -lt 9 ]; then method="card"
  else method="transfer"; fi
  # Propina solo efectivo y si hay mesero
  tip=0
  if [ -n "$waiter_name" ] && [ "$method" = "cash" ]; then
    tips_arr=(0 2000 3000 5000 5000 8000 10000 0 0 0)
    tip=${tips_arr[$((RANDOM % 10))]}
  fi
  PGPASSWORD="$PP" psql -U "$PU" -d pos_payments -q \
    -c "INSERT INTO payments (id,\"tenantId\",\"orderId\",amount,tip,method,\"cashierName\",notes,\"createdAt\",\"updatedAt\")
        VALUES (gen_random_uuid(),'$tenant_id','$ord_id',$total,$tip,'$method','Caja Principal','seed-pago','$created_at','$created_at')
        ON CONFLICT DO NOTHING;" 2>/dev/null || true

  # Actualizar el turno del día correspondiente
  day_str=$(echo "$created_at" | cut -c1-10)
  PGPASSWORD="$PP" psql -U "$PU" -d pos_payments -q \
    -c "UPDATE cash_shifts
        SET \"cashSales\"   = \"cashSales\"   + CASE WHEN '$method'='cash'     THEN $total ELSE 0 END,
            \"cardSales\"   = \"cardSales\"   + CASE WHEN '$method'='card'     THEN $total ELSE 0 END,
            \"transferSales\"=\"transferSales\"+ CASE WHEN '$method'='transfer' THEN $total ELSE 0 END,
            \"totalTips\"   = \"totalTips\"   + $tip,
            \"updatedAt\"   = NOW()
        WHERE \"tenantId\"='$tenant_id'
          AND notes = 'seed-turno-$day_str';" 2>/dev/null || true
done

# Cerrar turnos: calcular expectedCash y discrepancy
PGPASSWORD="$PP" psql -U "$PU" -d pos_payments -q \
  -c "UPDATE cash_shifts
      SET \"expectedCash\" = \"initialCash\" + \"cashSales\",
          \"countedCash\"  = \"initialCash\" + \"cashSales\" + (RANDOM()*10000 - 5000)::NUMERIC(12,2),
          \"discrepancy\"  = (RANDOM()*10000 - 5000)::NUMERIC(12,2)
      WHERE \"tenantId\"='$TENANT_ID'
        AND status='closed'
        AND notes LIKE 'seed-%';" 2>/dev/null

echo "✓ Pagos y turnos de caja"

# ── RESUMEN ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " ✅ Datos de prueba cargados exitosamente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PGPASSWORD="$PP" psql -U "$PU" -d pos_products -t -A \
  -c "SELECT '  Categorías: ' || COUNT(*) FROM categories WHERE \"tenantId\"='$TENANT_ID';"
PGPASSWORD="$PP" psql -U "$PU" -d pos_products -t -A \
  -c "SELECT '  Productos:  ' || COUNT(*) FROM products   WHERE \"tenantId\"='$TENANT_ID';"
PGPASSWORD="$PP" psql -U "$PU" -d pos_inventory -t -A \
  -c "SELECT '  Inventario: ' || COUNT(*) FROM inventory  WHERE \"tenantId\"='$TENANT_ID';"
PGPASSWORD="$PP" psql -U "$PU" -d pos_inventory -t -A \
  -c "SELECT '  Recetas:    ' || COUNT(*) FROM recipes    WHERE \"tenantId\"='$TENANT_ID';"
PGPASSWORD="$PP" psql -U "$PU" -d pos_orders -t -A \
  -c "SELECT '  Pedidos:    ' || COUNT(*) FROM orders     WHERE \"tenantId\"='$TENANT_ID' AND \"orderNumber\" LIKE 'ORD-SEED-%';"
PGPASSWORD="$PP" psql -U "$PU" -d pos_payments -t -A \
  -c "SELECT '  Pagos:      ' || COUNT(*) FROM payments   WHERE \"tenantId\"='$TENANT_ID' AND notes LIKE 'seed-%';"
PGPASSWORD="$PP" psql -U "$PU" -d pos_payments -t -A \
  -c "SELECT '  Turnos:     ' || COUNT(*) FROM cash_shifts WHERE \"tenantId\"='$TENANT_ID' AND notes LIKE 'seed-%';"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
