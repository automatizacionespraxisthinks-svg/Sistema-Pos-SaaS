import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';

interface DateRange { from: Date; to: Date }

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private ordersDb: Pool;
  private paymentsDb: Pool;

  onModuleInit() {
    this.ordersDb = new Pool({
      connectionString:
        process.env.ORDERS_DB_URL ||
        'postgresql://pos_user:pos_password@localhost:5432/pos_orders',
      max: 5,
    });
    this.paymentsDb = new Pool({
      connectionString:
        process.env.PAYMENTS_DB_URL ||
        'postgresql://pos_user:pos_password@localhost:5432/pos_payments',
      max: 5,
    });
  }

  // ─── helpers ────────────────────────────────────────────────────────────────

  private getRange(period: string, date?: string): DateRange {
    const ref = date ? new Date(date + 'T00:00:00') : new Date();
    ref.setHours(0, 0, 0, 0);

    if (period === 'day') {
      const to = new Date(ref);
      to.setHours(23, 59, 59, 999);
      return { from: ref, to };
    }
    if (period === 'week') {
      const dow = ref.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      const from = new Date(ref);
      from.setDate(ref.getDate() + diff);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    // month
    const from = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const to = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from, to };
  }

  private prevRange(r: DateRange): DateRange {
    const ms = r.to.getTime() - r.from.getTime() + 1;
    return { from: new Date(r.from.getTime() - ms), to: new Date(r.from.getTime() - 1) };
  }

  // ─── endpoints ──────────────────────────────────────────────────────────────

  async getOverview(tenantId: string, period = 'day', date?: string) {
    if (!tenantId) return this.emptyOverview(period);
    try {
      const range = this.getRange(period, date);
      const prev  = this.prevRange(range);

      const [cur, prv] = await Promise.all([
        this.ordersDb.query(
          `SELECT
             COUNT(*)                           AS orders,
             COALESCE(SUM(total),    0)         AS revenue,
             COALESCE(AVG(total),    0)         AS avg_ticket,
             COALESCE(SUM(tax),      0)         AS tax,
             COALESCE(SUM(discount), 0)         AS discount
           FROM orders
           WHERE "tenantId" = $1
             AND "paymentStatus"::text = 'paid'
             AND status::text != 'cancelled'
             AND "createdAt" >= $2 AND "createdAt" <= $3`,
          [tenantId, range.from, range.to],
        ),
        this.ordersDb.query(
          `SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS revenue
           FROM orders
           WHERE "tenantId" = $1
             AND "paymentStatus"::text = 'paid'
             AND status::text != 'cancelled'
             AND "createdAt" >= $2 AND "createdAt" <= $3`,
          [tenantId, prev.from, prev.to],
        ),
      ]);

      // Tips del período (desde payments DB)
      const tipsResult = await this.paymentsDb.query(
        `SELECT COALESCE(SUM(tip), 0) AS total_tips
         FROM payments
         WHERE "tenantId" = $1 AND status::text = 'completed'
           AND "createdAt" >= $2 AND "createdAt" <= $3`,
        [tenantId, range.from, range.to],
      );

      const c = cur.rows[0];
      const p = prv.rows[0];
      return {
        period,
        from:      range.from,
        to:        range.to,
        revenue:   +c.revenue,
        orders:    +c.orders,
        avgTicket: +c.avg_ticket,
        tax:       +c.tax,
        discount:  +c.discount,
        totalTips: +tipsResult.rows[0].total_tips,
        prev: { revenue: +p.revenue, orders: +p.orders },
      };
    } catch (err) {
      console.error('[analytics] getOverview error:', err.message);
      return this.emptyOverview(period);
    }
  }

  async getRevenueTrend(tenantId: string, period = 'day', date?: string) {
    if (!tenantId) return [];
    try {
      const { from, to } = this.getRange(period, date);
      const trunc = period === 'day' ? 'hour' : 'day';

      const r = await this.ordersDb.query(
        `SELECT
           DATE_TRUNC($1, "createdAt") AS bucket,
           COUNT(*)                    AS orders,
           COALESCE(SUM(total), 0)     AS revenue,
           COALESCE(SUM(tax),   0)     AS tax
         FROM orders
         WHERE "tenantId" = $2
           AND "paymentStatus"::text = 'paid'
           AND status::text != 'cancelled'
           AND "createdAt" >= $3 AND "createdAt" <= $4
         GROUP BY bucket
         ORDER BY bucket ASC`,
        [trunc, tenantId, from, to],
      );

      return r.rows.map(row => ({
        bucket:  row.bucket,
        orders:  +row.orders,
        revenue: +row.revenue,
        tax:     +row.tax,
      }));
    } catch (err) {
      console.error('[analytics] getRevenueTrend error:', err.message);
      return [];
    }
  }

  async getTopProducts(tenantId: string, period = 'month', date?: string, limit = 10) {
    if (!tenantId) return [];
    try {
      const { from, to } = this.getRange(period, date);

      const r = await this.ordersDb.query(
        `SELECT
           oi."productId",
           oi."productName",
           SUM(oi.quantity)               AS qty,
           COALESCE(SUM(oi.subtotal), 0)  AS revenue,
           COUNT(DISTINCT o.id)           AS order_count
         FROM order_items oi
         JOIN orders o ON oi."orderId" = o.id
         WHERE o."tenantId" = $1
           AND o."paymentStatus"::text = 'paid'
           AND o.status::text != 'cancelled'
           AND o."createdAt" >= $2 AND o."createdAt" <= $3
           AND oi."isVoided" = false
         GROUP BY oi."productId", oi."productName"
         ORDER BY revenue DESC
         LIMIT $4`,
        [tenantId, from, to, limit],
      );

      return r.rows.map(row => ({
        productId:   row.productId,
        productName: row.productName,
        qty:         +row.qty,
        revenue:     +row.revenue,
        orderCount:  +row.order_count,
      }));
    } catch (err) {
      console.error('[analytics] getTopProducts error:', err.message);
      return [];
    }
  }

  async getPaymentMethods(tenantId: string, period = 'day', date?: string) {
    if (!tenantId) return [];
    try {
      const { from, to } = this.getRange(period, date);

      const r = await this.paymentsDb.query(
        `SELECT
           method,
           COUNT(*)                 AS count,
           COALESCE(SUM(amount), 0) AS total,
           COALESCE(SUM(tip),    0) AS total_tips
         FROM payments
         WHERE "tenantId" = $1
           AND status::text = 'completed'
           AND "createdAt" >= $2 AND "createdAt" <= $3
         GROUP BY method
         ORDER BY total DESC`,
        [tenantId, from, to],
      );

      return r.rows.map(row => ({
        method:    row.method,
        count:     +row.count,
        total:     +row.total,
        totalTips: +row.total_tips,
      }));
    } catch (err) {
      console.error('[analytics] getPaymentMethods error:', err.message);
      return [];
    }
  }

  async getHourlyChart(tenantId: string, date?: string) {
    if (!tenantId) return this.emptyHourly();
    try {
      const { from, to } = this.getRange('day', date);

      const r = await this.ordersDb.query(
        `SELECT
           EXTRACT(HOUR FROM "createdAt") AS hour,
           COUNT(*)                       AS orders,
           COALESCE(SUM(total), 0)        AS revenue
         FROM orders
         WHERE "tenantId" = $1
           AND "paymentStatus"::text = 'paid'
           AND status::text != 'cancelled'
           AND "createdAt" >= $2 AND "createdAt" <= $3
         GROUP BY hour
         ORDER BY hour ASC`,
        [tenantId, from, to],
      );

      const map = new Map<number, Record<string, any>>(r.rows.map(row => [+row.hour, row]));
      return Array.from({ length: 24 }, (_, h) => {
        const row = map.get(h);
        return { hour: h, label: `${String(h).padStart(2, '0')}:00`, orders: row ? +row.orders : 0, revenue: row ? +row.revenue : 0 };
      });
    } catch (err) {
      console.error('[analytics] getHourlyChart error:', err.message);
      return this.emptyHourly();
    }
  }

  // ─── legacy stubs (still used by dashboard page) ────────────────────────────

  async getDashboard(tenantId: string, date?: string) {
    return { tenantId, date: date || new Date().toISOString().slice(0, 10), totalSales: 0, totalOrders: 0, averageTicket: 0 };
  }

  async getSalesReport(tenantId: string, from?: string, to?: string) {
    return { tenantId, from, to, data: [] };
  }

  // ─── private helpers ────────────────────────────────────────────────────────

  private emptyOverview(period: string) {
    return { period, revenue: 0, orders: 0, avgTicket: 0, tax: 0, discount: 0, prev: { revenue: 0, orders: 0 } };
  }

  private emptyHourly() {
    return Array.from({ length: 24 }, (_, h) => ({
      hour: h, label: `${String(h).padStart(2, '0')}:00`, orders: 0, revenue: 0,
    }));
  }
}
