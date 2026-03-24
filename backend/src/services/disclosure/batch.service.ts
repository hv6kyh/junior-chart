// backend/src/services/disclosure/batch.service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new (YahooFinance as any)();
import type { DisclosureProvider, DisclosureType } from './types.js';
import { DISCLOSURE_TYPES } from './types.js';
import type { DisclosureService } from './disclosure.service.js';
import type { AnalysisService } from './analysis.service.js';

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

  async updatePrices(): Promise<{ updated: number; failed: number }> {
    let updated = 0;
    let failed = 0;

    for (const period of ['1w', '1m', '3m'] as const) {
      const disclosures = await this.disclosureService.getDisclosuresNeedingPrices(period);
      const daysMap = { '1w': 7, '1m': 30, '3m': 90 };

      for (const d of disclosures) {
        try {
          if (!d.stockCode) continue;

          const symbol = `${d.stockCode}${this.getYahooSuffix(d.market || 'Y')}`;

          const baseDate = new Date(d.disclosedAt);
          const targetDate = new Date(baseDate);
          targetDate.setDate(targetDate.getDate() + daysMap[period]);

          const quotes = await yahooFinance.chart(symbol, {
            period1: baseDate.toISOString().slice(0, 10),
            period2: new Date(targetDate.getTime() + 7 * 86400000).toISOString().slice(0, 10),
            interval: '1d',
          });

          if (!quotes.quotes || quotes.quotes.length < 2) continue;

          const basePrice = quotes.quotes[0].close;
          const priceColumnMap = { '1w': 'price_1w', '1m': 'price_1m', '3m': 'price_3m' };
          const returnColumnMap = { '1w': 'return_1w', '1m': 'return_1m', '3m': 'return_3m' };
          const businessDaysMap = { '1w': 5, '1m': 21, '3m': 63 };

          const targetIdx = Math.min(businessDaysMap[period], quotes.quotes.length - 1);
          const targetPrice = quotes.quotes[targetIdx].close;

          if (basePrice == null || targetPrice == null) continue;

          const returnPct = ((targetPrice - basePrice) / basePrice) * 100;

          const { error } = await this.supabase
            .from('disclosure_prices')
            .upsert(
              {
                disclosure_id: d.id,
                base_price: basePrice,
                [priceColumnMap[period]]: targetPrice,
                [returnColumnMap[period]]: returnPct,
                calculated_at: new Date().toISOString(),
              },
              { onConflict: 'disclosure_id' }
            );

          if (error) {
            console.error(`Price update failed for ${d.id}: ${error.message}`);
            failed++;
          } else {
            updated++;
          }
        } catch (err) {
          console.error(`Price fetch failed for ${d.stockCode}: ${err}`);
          failed++;
        }
      }
    }

    return { updated, failed };
  }

  async updateAllStats(): Promise<{ updated: number }> {
    let updated = 0;
    const types = Object.keys(DISCLOSURE_TYPES) as DisclosureType[];

    for (const type of types) {
      for (const period of ['1w', '1m', '3m'] as const) {
        await this.analysisService.updatePatternStats(type, period);
        updated++;
      }
    }

    return { updated };
  }

  private getYahooSuffix(market: string): string {
    return market === 'Y' ? '.KS' : '.KQ';
  }
}
