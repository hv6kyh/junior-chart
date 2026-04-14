// backend/src/services/disclosure/analysis.service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { getTMultiplier } from '../../utils/statistics.js';
import type { PatternStats, DisclosureType } from './types.js';

interface StatsResult {
  sampleCount: number;
  avgReturn: number | null;
  medianReturn: number | null;
  stddev: number | null;
  positiveRate: number | null;
  ciLower68: number | null;
  ciUpper68: number | null;
  ciLower95: number | null;
  ciUpper95: number | null;
}

export class AnalysisService {
  constructor(private supabase: SupabaseClient) {}

  static calculateStats(returns: number[]): StatsResult {
    const n = returns.length;

    if (n === 0) {
      return {
        sampleCount: 0,
        avgReturn: null,
        medianReturn: null,
        stddev: null,
        positiveRate: null,
        ciLower68: null,
        ciUpper68: null,
        ciLower95: null,
        ciUpper95: null,
      };
    }

    const mean = returns.reduce((a, b) => a + b, 0) / n;

    const sorted = [...returns].sort((a, b) => a - b);
    const median =
      n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    const positiveRate = returns.filter((r) => r > 0).length / n;

    if (n < 2) {
      return {
        sampleCount: n,
        avgReturn: mean,
        medianReturn: median,
        stddev: null,
        positiveRate,
        ciLower68: null,
        ciUpper68: null,
        ciLower95: null,
        ciUpper95: null,
      };
    }

    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (n - 1);
    const stddev = Math.sqrt(variance);
    const se = stddev / Math.sqrt(n);

    const df = n - 1;
    const t68 = getTMultiplier(df, '68');
    const t95 = getTMultiplier(df, '95');

    return {
      sampleCount: n,
      avgReturn: mean,
      medianReturn: median,
      stddev,
      positiveRate,
      ciLower68: mean - t68 * se,
      ciUpper68: mean + t68 * se,
      ciLower95: mean - t95 * se,
      ciUpper95: mean + t95 * se,
    };
  }

  async updatePatternStats(
    disclosureType: DisclosureType,
    period: '1w' | '1m' | '3m',
  ): Promise<void> {
    const returnColumn = `return_${period}`;

    const { data, error } = await this.supabase
      .from('disclosure_prices')
      .select(`${returnColumn}, disclosures!inner(disclosure_type)`)
      .eq('disclosures.disclosure_type', disclosureType)
      .not(returnColumn, 'is', null);

    if (error) throw new Error(`Failed to fetch returns: ${error.message}`);

    const returns = (data || []).map((row: any) => Number(row[returnColumn]));
    const stats = AnalysisService.calculateStats(returns);

    const { error: upsertError } = await this.supabase
      .from('pattern_stats')
      .upsert(
        {
          disclosure_type: disclosureType,
          period,
          sample_count: stats.sampleCount,
          avg_return: stats.avgReturn,
          median_return: stats.medianReturn,
          stddev: stats.stddev,
          positive_rate: stats.positiveRate,
          ci_lower_68: stats.ciLower68,
          ci_upper_68: stats.ciUpper68,
          ci_lower_95: stats.ciLower95,
          ci_upper_95: stats.ciUpper95,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'disclosure_type,period' },
      );

    if (upsertError) throw new Error(`Failed to upsert pattern stats: ${upsertError.message}`);
  }

  async getStatsByType(disclosureType: DisclosureType): Promise<PatternStats[]> {
    const { data, error } = await this.supabase
      .from('pattern_stats')
      .select('*')
      .eq('disclosure_type', disclosureType)
      .order('period');

    if (error) throw new Error(`Failed to fetch pattern stats: ${error.message}`);

    return (data || []).map((row: any) => ({
      id: row.id,
      disclosureType: row.disclosure_type,
      period: row.period,
      sampleCount: row.sample_count,
      avgReturn: row.avg_return,
      medianReturn: row.median_return,
      stddev: row.stddev,
      positiveRate: row.positive_rate,
      ciLower68: row.ci_lower_68,
      ciUpper68: row.ci_upper_68,
      ciLower95: row.ci_lower_95,
      ciUpper95: row.ci_upper_95,
      updatedAt: row.updated_at,
    }));
  }

  async getAllTypesSummary(): Promise<
    Array<{
      type: DisclosureType;
      label: string;
      sampleCount: number;
      avgReturn1m: number | null;
      positiveRate1m: number | null;
    }>
  > {
    const { data, error } = await this.supabase
      .from('pattern_stats')
      .select('*')
      .eq('period', '1m')
      .gt('sample_count', 0)
      .order('sample_count', { ascending: false });

    if (error) throw new Error(`Failed to fetch type summary: ${error.message}`);

    const { DISCLOSURE_TYPES } = await import('./types.js');
    return (data || []).map((row: any) => ({
      type: row.disclosure_type as DisclosureType,
      label: DISCLOSURE_TYPES[row.disclosure_type as DisclosureType] || row.disclosure_type,
      sampleCount: row.sample_count,
      avgReturn1m: row.avg_return,
      positiveRate1m: row.positive_rate,
    }));
  }
}
