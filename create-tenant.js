/**
 * create-tenant.js — CLI para crear un nuevo negocio en el sistema POS.
 *
 * Uso:
 *   node create-tenant.js \
 *     --name   "Restaurante El Sabor" \
 *     --slug   "el-sabor" \
 *     --email  "admin@elsabor.com" \
 *     --pass   "mipassword123" \
 *     --fname  "Carlos" \
 *     --lname  "López"
 *
 * Variables de entorno opcionales:
 *   GATEWAY_URL          — URL del API gateway (default: http://localhost:3000)
 *   REGISTRATION_SECRET  — Debe coincidir con el del .env del auth-service
 */

const http  = require('http');
const https = require('https');

// ── Parse CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const get  = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : undefined;
};

const GATEWAY = (process.env.GATEWAY_URL || 'http://localhost:3000').replace(/\/$/, '');
const SECRET  = process.env.REGISTRATION_SECRET || '';

const name  = get('--name');
const slug  = get('--slug');
const email = get('--email');
const pass  = get('--pass');
const fname = get('--fname') || 'Admin';
const lname = get('--lname') || 'Usuario';

if (!name || !slug || !email || !pass) {
  console.error(`
✗ Faltan parámetros obligatorios.

Uso:
  node create-tenant.js \\
    --name  "Nombre del negocio" \\
    --slug  "codigo-unico" \\
    --email "admin@negocio.com" \\
    --pass  "contraseña" \\
    --fname "Nombre" \\
    --lname "Apellido"

Variables de entorno:
  GATEWAY_URL          (default: http://localhost:3000)
  REGISTRATION_SECRET  (requerido si está configurado en el servidor)
`);
  process.exit(1);
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url  = new URL(GATEWAY + path);
    const lib  = url.protocol === 'https:' ? https : http;
    const data = JSON.stringify(body);
    const opts = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
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
    r.on('error', e => reject(new Error(`${e.message} (¿Está corriendo el servidor en ${GATEWAY}?)`)));
    r.write(data);
    r.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== Crear nuevo negocio ===');
  console.log(`  Gateway : ${GATEWAY}`);
  console.log(`  Negocio : ${name}`);
  console.log(`  Código  : ${slug}`);
  console.log(`  Admin   : ${fname} ${lname} <${email}>\n`);

  const headers = SECRET ? { 'x-registration-secret': SECRET } : {};

  const resp = await post('/api/auth/register', {
    businessName: name,
    slug,
    firstName: fname,
    lastName:  lname,
    email,
    password:  pass,
  }, headers);

  if (resp.s === 200 || resp.s === 201) {
    const { user } = resp.d;
    console.log('✅ Negocio creado exitosamente!\n');
    console.log(`  TenantId : ${user.tenantId}`);
    console.log(`  Código   : ${slug}`);
    console.log(`  Email    : ${email}`);
    console.log(`  Password : ${pass}`);
    console.log('\n📱 El cliente ya puede iniciar sesión con estos datos.\n');
  } else {
    console.error('✗ Error al crear el negocio:');
    console.error(`  Status  : ${resp.s}`);
    console.error(`  Mensaje : ${resp.d?.message || JSON.stringify(resp.d)}`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('\n✗ Error fatal:', e.message);
  process.exit(1);
});
