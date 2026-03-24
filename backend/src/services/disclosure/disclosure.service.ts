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

  async getDisclosuresNeedingPrices(period: '1w' | '1m' | '3m'): Promise<Disclosure[]> {
    const daysMap = { '1w': 5, '1m': 21, '3m': 63 };
    const businessDays = daysMap[period];
    const columnMap = { '1w': 'price_1w', '1m': 'price_1m', '3m': 'price_3m' };
    const priceColumn = columnMap[period];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Math.ceil(businessDays * 1.5));

    const { data, error } = await this.supabase
      .from('disclosures')
      .select('*, disclosure_prices!left(*)')
      .not('stock_code', 'is', null)
      .lte('disclosed_at', cutoffDate.toISOString().slice(0, 10))
      .or(`disclosure_prices.${priceColumn}.is.null,disclosure_prices.id.is.null`);

    if (error) throw new Error(`Failed to fetch disclosures needing prices: ${error.message}`);
    return (data || []).map(this.mapRow);
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
