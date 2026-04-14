/**
 * AuditClient — fire-and-forget utility.
 * Copy this file into any microservice that needs to emit audit events.
 * Uses Node's built-in `http` module — no extra dependencies.
 */
import * as http from 'http';

export interface AuditPayload {
  tenantId: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  module: string;
  action: string;
  entityId?: string;
  entityType?: string;
  previousValue?: any;
  newValue?: any;
  description?: string;
  ipAddress?: string;
}

export function auditLog(payload: AuditPayload): void {
  const auditUrl = process.env.AUDIT_SERVICE_URL || 'http://localhost:3008';
  const body = JSON.stringify(payload);

  try {
    const parsed = new URL(`${auditUrl}/audit-logs`);
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port:     parsed.port || 80,
      path:     parsed.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      // drain the response so the socket can be reused
      res.resume();
    });

    req.on('error', () => { /* intentionally silent — audit must not break flows */ });
    req.setTimeout(3000, () => { req.destroy(); });
    req.write(body);
    req.end();
  } catch {
    // intentionally silent
  }
}
