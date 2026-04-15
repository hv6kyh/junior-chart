// backend/src/services/disclosure/batch.service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import YahooFinance from 'yahoo-finance2';
import { appendFileSync } from 'node:fs';
import type { DisclosureProvider } from './types.js';
import type { DisclosureService } from './disclosure.service.js';
import type { AnalysisService } from './analysis.service.js';

const yahooFinance = new (YahooFinance as any)();
try {
  (yahooFinance as any).setGlobalConfig?.({
    validation: { logErrors: false, logOptionsErrors: false },
  });
} catch {
  /* noop: older versions without setGlobalConfig */
}

function isRetriable(err: unknown): boolean {
  const msg = String((err as any)?.message ?? err ?? '').toLowerCase();
  if (/429|rate.?limit|too.?many.?requests/.test(msg)) return true;
  if (/50[234]|bad gateway|gateway.?timeout/.test(msg)) return true;
  if (/econnreset|etimedout|fetch failed|network|enotfound|socket hang up/.test(msg)) return true;
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= maxAttempts || !isRetriable(err)) throw err;
      const delay = 1000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 500);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

const FAILURE_LOG_PATH = '/tmp/junior-chart-backfill-failures.jsonl';
const FAILURE_LOG_MAX = 200;

export class BatchService {
  constructor(
    private provider: DisclosureProvider,
    private disclosureService: DisclosureService,
    private analysisService: AnalysisService,
    private supabase: SupabaseClient,
  ) {}

  async collectDisclosures(date: string): Promise<{ total: number; classified: number }> {
    const raws = await this.provider.fetchRecent(date);

    const classified = raws.map((raw) => ({
      ...raw,
      classifiedType: this.provider.classifyType(raw),
    }));

    await this.disclosureService.saveDisclosures(this.provider.source, classified);

    const classifiedCount = classified.filter((c) => c.classifiedType !== null).length;
    return { total: raws.length, classified: classifiedCount };
  }

  async collectHistorical(from: string, to: string): Promise<{ total: number; classified: number }> {
    const raws = await this.provider.fetchHistorical(from, to);

    const classified = raws.map((raw) => ({
      ...raw,
      classifiedType: this.provider.classifyType(raw),
    }));

    const batchSize = 1000;
    for (let i = 0; i < classified.length; i += batchSize) {
      const batch = classified.slice(i, i + batchSize);
      await this.disclosureService.saveDisclosures(this.provider.source, batch);
    }

    const classifiedCount = classified.filter((c) => c.classifiedType !== null).length;
    return { total: raws.length, classified: classifiedCount };
  }

  async updatePrices(): Promise<{ updated: number; failed: number; skipped: number }> {
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    let processed = 0;
    let failuresLogged = 0;
    let aborted = false;
    let abortReason = '';

    const disclosures = await this.disclosureService.getDisclosuresNeedingAnyPrice(11);
    const total = disclosures.length;

    const CONCURRENCY = 5;
    const LOG_EVERY = 1000;
    const SAFETY_VALVE_AT = 1000;
    const SAFETY_VALVE_THRESHOLD = 0.5;

    console.log(
      `  Processing ${total} disclosures needing prices (concurrency=${CONCURRENCY})...`
    );
    const startedAt = Date.now();

    const logFailure = (d: { id: string; stockCode: string | null }, kind: string, err: unknown) => {
      if (failuresLogged >= FAILURE_LOG_MAX) return;
      failuresLogged++;
      try {
        appendFileSync(
          FAILURE_LOG_PATH,
          JSON.stringify({
            at: new Date().toISOString(),
            id: d.id,
            stockCode: d.stockCode,
            kind,
            err: String((err as any)?.message ?? err).slice(0, 300),
          }) + '\n'
        );
      } catch {
        /* best effort */
      }
    };

    await runPool(disclosures, CONCURRENCY, async (d) => {
      if (aborted) return;

      try {
        if (!d.stockCode) {
          skipped++;
          return;
        }

        const symbol = `${d.stockCode}${this.getYahooSuffix(d.market || 'Y')}`;
        const baseDate = new Date(d.disclosedAt);
        const endDate = new Date(baseDate.getTime() + 100 * 86400000);

        let quotes: any;
        try {
          quotes = await withRetry(() =>
            yahooFinance.chart(
              symbol,
              {
                period1: baseDate.toISOString().slice(0, 10),
                period2: endDate.toISOString().slice(0, 10),
                interval: '1d',
              },
              { validateResult: false }
            )
          );
        } catch (err) {
          failed++;
          logFailure(d, 'fetch', err);
          return;
        }

        const arr = quotes?.quotes;
        if (!arr || arr.length < 2) {
          skipped++;
          return;
        }

        const basePrice = arr[0].close;
        if (basePrice == null) {
          skipped++;
          return;
        }

        const row: Record<string, any> = {
          disclosure_id: d.id,
          base_price: basePrice,
          calculated_at: new Date().toISOString(),
        };

        const periods: Array<{ key: '1w' | '1m' | '3m'; idx: number }> = [
          { key: '1w', idx: 5 },
          { key: '1m', idx: 21 },
          { key: '3m', idx: 63 },
        ];

        let anyFilled = false;
        for (const { key, idx } of periods) {
          if (arr.length > idx) {
            const targetClose = arr[idx].close;
            if (targetClose != null) {
              row[`price_${key}`] = targetClose;
              row[`return_${key}`] = ((targetClose - basePrice) / basePrice) * 100;
              anyFilled = true;
            }
          }
        }

        if (!anyFilled) {
          skipped++;
          return;
        }

        try {
          await withRetry(async () => {
            const res = await this.supabase
              .from('disclosure_prices')
              .upsert(row, { onConflict: 'disclosure_id' });
            if (res.error) {
              const wrapped = new Error(res.error.message);
              (wrapped as any).code = (res.error as any).code;
              throw wrapped;
            }
          });
          updated++;
        } catch (err) {
          failed++;
          logFailure(d, 'upsert', err);
        }
      } finally {
        processed++;

        if (
          !aborted &&
          processed >= SAFETY_VALVE_AT &&
          failed / processed > SAFETY_VALVE_THRESHOLD
        ) {
          aborted = true;
          abortReason = `failure rate ${((failed / processed) * 100).toFixed(0)}% > ${SAFETY_VALVE_THRESHOLD * 100}% after ${processed} processed`;
          console.error(`  ⚠ SAFETY VALVE: ${abortReason} — aborting remaining work`);
        }

        if (processed % LOG_EVERY === 0 || processed === total) {
          const elapsed = (Date.now() - startedAt) / 1000;
          const rate = processed / elapsed;
          const remainingMin = ((total - processed) / Math.max(rate, 0.001) / 60).toFixed(1);
          console.log(
            `    [${processed}/${total}] ${updated}u ${failed}f ${skipped}s · ${rate.toFixed(1)}/s · ETA ${remainingMin}m`
          );
        }
      }
    });

    if (aborted) {
      throw new Error(`updatePrices aborted: ${abortReason}`);
    }

    console.log(`  Final: ${updated} updated, ${failed} failed, ${skipped} skipped`);
    return { updated, failed, skipped };
  }

  async updateAllStats(): Promise<{ updated: number }> {
    const updated = await this.analysisService.updateAllPatternStats();
    return { updated };
  }

  private getYahooSuffix(market: string): string {
    return market === 'Y' ? '.KS' : '.KQ';
  }
}
