const http  = require('http');
const https = require('https');

// All calls go through the API gateway (the only externally exposed service).
// On VPS run:  node seed.js
// From outside: GATEWAY=http://<vps-ip>:3000 node seed.js
const GATEWAY = (process.env.GATEWAY_URL || process.env.AUTH_URL || 'http://localhost:3000').replace(/\/$/, '');

// Demo tenant
const SLUG          = process.env.TENANT_SLUG   || 'demo';
const BUSINESS_NAME = process.env.BUSINESS_NAME || 'Demo Restaurant';

// ── HTTP helper ────────────────────────────────────────────────────────────────
function req(path, method, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(GATEWAY + path);
    const lib  = url.protocol === 'https:' ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = lib.request(opts, (resp) => {
      let raw = '';
      resp.on('data', c => raw += c);
      resp.on('end', () => {
        try { resolve({ s: resp.statusCode, d: JSON.parse(raw) }); }
        catch { resolve({ s: resp.statusCode, d: raw }); }
      });
    });
    r.on('error', (e) => reject(new Error(`${method} ${path} → ${e.message}`)));
    if (data) r.write(data);
    r.end();
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== POS SaaS Seed ===');
  console.log(`Gateway: ${GATEWAY}\n`);

  // 1. Register business + admin
  console.log('1. Registrando negocio demo...');
  let accessToken, tenantId;

  const regResp = await req('/api/auth/register', 'POST', {
    businessName: BUSINESS_NAME,
    slug:         SLUG,
    firstName:    'Carlos',
    lastName:     'Admin',
    email:        'admin@demo.com',
    password:     'password123',
  });

  if (regResp.s === 201 || regResp.s === 200) {
    accessToken = regResp.d.accessToken;
    tenantId    = regResp.d.user?.tenantId;
    console.log(`  ✔ Negocio "${BUSINESS_NAME}" creado (código: ${SLUG})`);
    console.log(`  ✔ Admin: admin@demo.com`);
  } else if (
    regResp.d?.message?.includes('código') ||
    regResp.d?.message?.includes('slug')   ||
    regResp.d?.message?.includes('use')    ||
    regResp.s === 409
  ) {
    console.log(`  ↩ Negocio ya existe, iniciando sesión...`);
    const loginResp = await req('/api/auth/login', 'POST', {
      slug: SLUG, email: 'admin@demo.com', password: 'password123',
    });
    if (!loginResp.d?.accessToken) {
      console.error('  ✗ Login fallido:', JSON.stringify(loginResp.d));
      process.exit(1);
    }
    accessToken = loginResp.d.accessToken;
    tenantId    = loginResp.d.user?.tenantId;
    console.log(`  ✔ Login OK`);
  } else {
    console.error('  ✗ Error inesperado:', regResp.s, JSON.stringify(regResp.d));
    process.exit(1);
  }

  console.log(`  TenantId: ${tenantId}`);
  const h = { Authorization: `Bearer ${accessToken}`, 'x-tenant-id': tenantId };

  // 2. Staff users
  console.log('\n2. Creando usuarios de staff...');
  const staff = [
    { firstName: 'Laura',   lastName: 'Cajero', email: 'cajero@demo.com', password: 'password123', role: 'cashier' },
    { firstName: 'Juan',    lastName: 'Mesero', email: 'mesero@demo.com', password: 'password123', role: 'waiter'  },
    { firstName: 'Chef',    lastName: 'Garcia', email: 'cocina@demo.com', password: 'password123', role: 'kitchen' },
    { firstName: 'Roberto', lastName: 'Dueno',  email: 'dueno@demo.com',  password: 'password123', role: 'viewer'  },
  ];
  for (const u of staff) {
    const r = await req('/api/auth/users', 'POST', u, h);
    const ok   = r.s === 201 || r.s === 200;
    const skip = r.d?.message?.includes('already') || r.s === 409;
    console.log(`  ${ok || skip ? '✔' : '✗'} ${u.email} (${u.role})${skip ? ' — ya existe' : ''}`);
  }

  // 3. Categories
  console.log('\n3. Creando categorías...');
  const catDefs = [
    { name: 'Bebidas',            color: '#3B82F6', sortOrder: 1 },
    { name: 'Platos principales', color: '#10B981', sortOrder: 2 },
    { name: 'Postres',            color: '#F59E0B', sortOrder: 3 },
    { name: 'Entradas',           color: '#EF4444', sortOrder: 4 },
  ];
  const cats = {};
  for (const c of catDefs) {
    const r = await req('/api/categories', 'POST', c, h);
    if (r.d?.id) { cats[c.name] = r.d.id; console.log(`  ✔ ${c.name}`); }
    else if (r.s === 409 || r.d?.message?.includes('already')) console.log(`  ↩ ${c.name} ya existe`);
    else console.log(`  ✗ ${c.name}: ${JSON.stringify(r.d)}`);
  }

  // If all categories already existed, fetch them
  if (Object.keys(cats).length === 0) {
    const r = await req('/api/categories', 'GET', null, h);
    if (Array.isArray(r.d)) {
      for (const c of r.d) cats[c.name] = c.id;
      console.log(`  ↩ Usando ${r.d.length} categorías existentes`);
    }
  }

  // 4. Products
  console.log('\n4. Creando productos...');
  const products = [
    { name: 'Café Americano',      price: 4500,  costPrice: 800,  categoryId: cats['Bebidas'],            sku: 'BEB-001' },
    { name: 'Capuchino',           price: 6500,  costPrice: 1200, categoryId: cats['Bebidas'],            sku: 'BEB-002' },
    { name: 'Jugo Natural',        price: 5000,  costPrice: 1500, categoryId: cats['Bebidas'],            sku: 'BEB-003' },
    { name: 'Gaseosa',             price: 3500,  costPrice: 900,  categoryId: cats['Bebidas'],            sku: 'BEB-004' },
    { name: 'Agua Mineral',        price: 2500,  costPrice: 500,  categoryId: cats['Bebidas'],            sku: 'BEB-005' },
    { name: 'Bandeja Paisa',       price: 22000, costPrice: 8000, categoryId: cats['Platos principales'], sku: 'PLA-001', preparationTime: 15 },
    { name: 'Pollo a la Plancha',  price: 18000, costPrice: 6000, categoryId: cats['Platos principales'], sku: 'PLA-002', preparationTime: 12 },
    { name: 'Pasta Carbonara',     price: 19500, costPrice: 5500, categoryId: cats['Platos principales'], sku: 'PLA-003', preparationTime: 10 },
    { name: 'Hamburguesa Clasica', price: 16000, costPrice: 5000, categoryId: cats['Platos principales'], sku: 'PLA-004', preparationTime: 8  },
    { name: 'Torta de Chocolate',  price: 8000,  costPrice: 2500, categoryId: cats['Postres'],            sku: 'POS-001' },
    { name: 'Helado 3 bolas',      price: 6500,  costPrice: 1800, categoryId: cats['Postres'],            sku: 'POS-002' },
    { name: 'Brownie con helado',  price: 9000,  costPrice: 3000, categoryId: cats['Postres'],            sku: 'POS-003' },
    { name: 'Ensalada Cesar',      price: 12000, costPrice: 3500, categoryId: cats['Entradas'],           sku: 'ENT-001', preparationTime: 5 },
    { name: 'Patacones con hogao', price: 9500,  costPrice: 2800, categoryId: cats['Entradas'],           sku: 'ENT-002', preparationTime: 7 },
  ].filter(p => p.categoryId);

  let ok = 0;
  for (const p of products) {
    const r = await req('/api/products', 'POST', p, h);
    if (r.d?.id) { ok++; console.log(`  ✔ ${p.name}`); }
    else if (r.s === 409 || r.d?.message?.includes('already')) console.log(`  ↩ ${p.name} ya existe`);
    else console.log(`  ✗ ${p.name}: ${JSON.stringify(r.d)}`);
  }

  console.log(`\n✅ Seed completado!`);
  console.log(`   Negocio : ${BUSINESS_NAME} (código: ${SLUG})`);
  console.log(`   Productos: ${ok}/${products.length}`);
  console.log('\n📱 Login:');
  console.log(`   Código   : ${SLUG}`);
  console.log('   Email    : admin@demo.com');
  console.log('   Password : password123\n');
}

main().catch(e => {
  console.error('\n✗ Error fatal:', e.message || e);
  process.exit(1);
});
