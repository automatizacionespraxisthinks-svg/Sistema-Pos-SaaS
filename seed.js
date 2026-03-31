const http = require('http');

const TENANT = process.env.TENANT_ID  || 'tenant-demo-001';
const AUTH   = process.env.AUTH_URL   || 'http://localhost:3001';
const PROD   = process.env.PROD_URL   || 'http://localhost:3003';

function req(base, method, path, body, headers = {}) {
  return new Promise((res, rej) => {
    const u = new URL(path, base);
    const d = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: u.hostname, port: u.port, path: u.pathname, method,
      headers: { 'Content-Type': 'application/json', ...headers, ...(d ? { 'Content-Length': Buffer.byteLength(d) } : {}) },
    }, (resp) => {
      let raw = '';
      resp.on('data', c => raw += c);
      resp.on('end', () => { try { res({ s: resp.statusCode, d: JSON.parse(raw) }); } catch { res({ s: resp.statusCode, d: raw }); } });
    });
    r.on('error', rej);
    if (d) r.write(d);
    r.end();
  });
}

async function main() {
  console.log('\n=== POS SaaS Seed ===\n');

  // Register users
  console.log('1. Creando usuarios...');
  const users = [
    { email: 'admin@demo.com',  password: 'password123', firstName: 'Carlos',  lastName: 'Admin',   role: 'admin',    tenantId: TENANT },
    { email: 'cajero@demo.com', password: 'password123', firstName: 'Laura',   lastName: 'Cajero',  role: 'cashier',  tenantId: TENANT },
    { email: 'mesero@demo.com', password: 'password123', firstName: 'Juan',    lastName: 'Mesero',  role: 'waiter',   tenantId: TENANT },
    { email: 'cocina@demo.com', password: 'password123', firstName: 'Chef',    lastName: 'Garcia',  role: 'kitchen',  tenantId: TENANT },
    { email: 'dueno@demo.com',  password: 'password123', firstName: 'Roberto', lastName: 'Dueno',   role: 'viewer',   tenantId: TENANT },
  ];
  for (const u of users) {
    const r = await req(AUTH, 'POST', '/auth/register', u);
    const ok = r.s === 201 || r.s === 200;
    const skip = r.d?.message?.includes('already');
    console.log(`  ${ok || skip ? '✔' : '✗'} ${u.email} ${skip ? '(ya existe)' : ''}`);
  }

  // Login
  console.log('\n2. Obteniendo token...');
  const login = await req(AUTH, 'POST', '/auth/login', { email: 'admin@demo.com', password: 'password123' });
  if (!login.d.accessToken) { console.error('Login fallido:', login.d); process.exit(1); }
  const h = { Authorization: `Bearer ${login.d.accessToken}`, 'x-tenant-id': TENANT };
  console.log('  ✔ Token OK');

  // Create categories
  console.log('\n3. Creando categorias...');
  const catDefs = [
    { name: 'Bebidas',            color: '#3B82F6', sortOrder: 1 },
    { name: 'Platos principales', color: '#10B981', sortOrder: 2 },
    { name: 'Postres',            color: '#F59E0B', sortOrder: 3 },
    { name: 'Entradas',           color: '#EF4444', sortOrder: 4 },
  ];
  const cats = {};
  for (const c of catDefs) {
    const r = await req(PROD, 'POST', '/categories', c, h);
    if (r.d.id) { cats[c.name] = r.d.id; console.log(`  ✔ ${c.name}`); }
    else console.log(`  ✗ ${c.name}: ${JSON.stringify(r.d)}`);
  }

  // Create products
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
  ];
  let ok = 0;
  for (const p of products) {
    const r = await req(PROD, 'POST', '/products', p, h);
    if (r.d.id) { ok++; console.log(`  ✔ ${p.name}`); }
    else console.log(`  ✗ ${p.name}: ${JSON.stringify(r.d)}`);
  }

  console.log(`\n✅ Seed completado!`);
  console.log(`   Usuarios: 5`);
  console.log(`   Categorías: ${Object.keys(cats).length}`);
  console.log(`   Productos: ${ok}/${products.length}`);
  console.log('\n📱 Abre http://localhost:3010');
  console.log('   Login: admin@demo.com / password123\n');
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
