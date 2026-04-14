import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';
import * as cors from 'cors';
import axios, { AxiosError } from 'axios';

const SERVICE_MAP: Record<string, string> = {
  '/api/auth':        process.env.AUTH_SERVICE_URL        || 'http://localhost:3001',
  '/api/users':       process.env.USER_SERVICE_URL        || 'http://localhost:3002',
  '/api/tenants':     process.env.USER_SERVICE_URL        || 'http://localhost:3002',
  '/api/products':    process.env.PRODUCT_SERVICE_URL     || 'http://localhost:3003',
  '/api/categories':  process.env.PRODUCT_SERVICE_URL     || 'http://localhost:3003',
  '/api/orders':      process.env.ORDER_SERVICE_URL       || 'http://localhost:3004',
  '/api/inventory':   process.env.INVENTORY_SERVICE_URL   || 'http://localhost:3005',
  '/api/payments':    process.env.PAYMENT_SERVICE_URL     || 'http://localhost:3006',
  '/api/cash-shifts': process.env.PAYMENT_SERVICE_URL     || 'http://localhost:3006',
  '/api/kitchen':     process.env.KITCHEN_SERVICE_URL     || 'http://localhost:3007',
  '/api/analytics':   process.env.ANALYTICS_SERVICE_URL   || 'http://localhost:3009',
};

function resolve(url: string): { target: string; path: string } | null {
  const prefix = Object.keys(SERVICE_MAP)
    .sort((a, b) => b.length - a.length)
    .find((p) => url === p || url.startsWith(p + '/') || url.startsWith(p + '?'));
  if (!prefix) return null;
  return { target: SERVICE_MAP[prefix], path: url.replace(/^\/api/, '') };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const server = app.getHttpAdapter().getInstance();

  // 1. CORS — must be first
  server.use(cors({ origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS' }));

  // 2. Body parsing
  server.use(express.json({ limit: '10mb' }));
  server.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 3. Proxy — all /api/* routes
  server.use(async (req: any, res: any, next: any) => {
    const match = resolve(req.url);
    if (!match) return next();

    // Build full URL including query string — do NOT use axios params separately
    // because match.path already contains the query string (?limit=200 etc.)
    const url = `${match.target}${match.path}`;

    // Extract claims from JWT so the client cannot spoof these headers
    let tenantFromJwt = '';
    let userIdFromJwt = '';
    const authHeader = req.headers['authorization'] as string;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = authHeader.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (decoded?.tenantId) tenantFromJwt = decoded.tenantId;
        if (decoded?.sub)      userIdFromJwt  = decoded.sub;      // user UUID
      } catch { /* invalid JWT — downstream will reject */ }
    }

    try {
      const upstream = await axios({
        method: req.method,
        url,
        data: ['GET', 'HEAD', 'DELETE'].includes(req.method) ? undefined : req.body,
        headers: {
          'content-type':  req.headers['content-type']  || 'application/json',
          'authorization': authHeader || '',
          'x-tenant-id':   tenantFromJwt || (req.headers['x-tenant-id'] as string) || '',
          'x-user-id':     userIdFromJwt || (req.headers['x-user-id'] as string) || '',
        },
        validateStatus: () => true,
        timeout: 30_000,
      });

      res.status(upstream.status).json(upstream.data);
    } catch (err) {
      const e = err as AxiosError;
      if (['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'].includes(e.code || '')) {
        return res.status(502).json({ statusCode: 502, message: `Service unavailable: ${match.target}` });
      }
      res.status(500).json({ statusCode: 500, message: 'Internal gateway error' });
    }
  });

  // 4. Swagger
  const config = new DocumentBuilder()
    .setTitle('POS SaaS — API Gateway')
    .setDescription('Proxy unificado para todos los microservicios')
    .setVersion('2.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API Gateway running on http://0.0.0.0:${port}`);
}
bootstrap();