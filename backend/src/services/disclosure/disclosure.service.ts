// backend/src/services/disclosure/disclosure.service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Disclosure, DisclosureType, RawDisclosure } from './types.js';

interface ClassifiedRaw extends RawDisclosure {
  classifiedType: DisclosureType | null;
}

export class DisclosureService {
  constructor(private supabase: SupabaseClient) {}

  async saveDisclosures(source: string, items: ClassifiedRaw[]): Promise<void> {
    const rows = items.map((item) => ({
      source,
      source_id: item.sourceId,
      corp_code: item.corpCode,
      corp_name: item.corpName,
      stock_code: item.stockCode,
      market: item.market || null,
      disclosure_type: item.classifiedType,
      title: item.title,
      disclosed_at: item.disclosedAt,
      source_url: item.sourceUrl,
    }));

    const { error } = await this.supabase
      .from('disclosures')
      .upsert(rows, { onConflict: 'source,source_id' });

    if (error) throw new Error(`Failed to save disclosures: ${error.message}`);
  }

  async getDisclosuresByDate(date: string): Promise<Disclosure[]> {
    const { data, error } = await this.supabase
      .from('disclosures')
      .select('*')
      .eq('disclosed_at', date)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch disclosures: ${error.message}`);
    return (data || []).map(this.mapRow);
  }

  async getDisclosureById(id: string): Promise<Disclosure | null> {
    const { data, error } = await this.supabase
      .from('disclosures')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return this.mapRow(data);
  }

  async getDisclosuresByType(type: DisclosureType): Promise<Disclosure[]> {
    const { data, error } = await this.supabase
      .from('disclosures')
      .select('*')
      .eq('disclosure_type', type)
      .order('disclosed_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch disclosures: ${error.message}`);
    return (data || []).map(this.mapRow);
  }

  async getDisclosuresNeedingAnyPrice(minAgeDays = 11): Promise<Disclosure[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - minAgeDays);
    const cutoffStr = cutoffDate.toISOString().slice(0, 10);

    const PAGE_SIZE = 1000;
    const MAX_ATTEMPTS = 5;
    const result: Disclosure[] = [];
    let offset = 0;

    while (true) {
      let data: any[] | null = null;
      let lastErr: unknown;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const res = await this.supabase
          .from('disclosures')
          .select('*, disclosure_prices!left(price_1w,price_1m,price_3m)')
          .not('stock_code', 'is', null)
          .lte('disclosed_at', cutoffStr)
          .order('disclosed_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (!res.error) {
          data = res.data;
          lastErr = undefined;
          break;
        }

        lastErr = res.error;
        const msg = res.error.message || '';
        const transient = /50[234]|bad gateway|gateway timeout|timeout|fetch failed|network/i.test(msg);
        if (!transient || attempt === MAX_ATTEMPTS) break;

        const backoffMs = 1000 * Math.pow(2, attempt - 1);
        console.warn(`  [retry ${attempt}/${MAX_ATTEMPTS}] page offset=${offset}: ${msg.slice(0, 120)} — waiting ${backoffMs}ms`);
        await new Promise((r) => setTimeout(r, backoffMs));
      }

      if (lastErr) {
        const msg = (lastErr as any)?.message || String(lastErr);
        throw new Error(`Failed to fetch disclosures needing prices (offset=${offset}): ${msg}`);
      }

      if (!data || data.length === 0) break;

      for (const row of data) {
        const prices = (row as any).disclosure_prices;
        const p1w = prices?.price_1w;
        const p1m = prices?.price_1m;
        const p3m = prices?.price_3m;
        if (p1w == null || p1m == null || p3m == null) {
          result.push(this.mapRow(row));
        }
      }

      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    return result;
  }

  private mapRow(row: any): Disclosure {
    return {
      id: row.id,
      source: row.source,
      sourceId: row.source_id,
      corpCode: row.corp_code,
      corpName: row.corp_name,
      stockCode: row.stock_code,
      market: row.market,
      disclosureType: row.disclosure_type,
      title: row.title,
      disclosedAt: row.disclosed_at,
      sourceUrl: row.source_url,
      createdAt: row.created_at,
    };
  }
}
