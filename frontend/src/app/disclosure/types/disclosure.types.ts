export type DisclosureType =
  | 'treasury_stock_acquire' | 'treasury_stock_dispose'
  | 'capital_increase' | 'capital_decrease'
  | 'convertible_bond' | 'bond_with_warrant'
  | 'merger' | 'split' | 'stock_split'
  | 'ceo_change' | 'large_shareholder'
  | 'earnings_preliminary' | 'business_transfer';

export const DISCLOSURE_TYPE_LABELS: Record<DisclosureType, string> = {
  treasury_stock_acquire: '자사주 취득',
  treasury_stock_dispose: '자사주 처분',
  capital_increase: '유상증자',
  capital_decrease: '감자',
  convertible_bond: 'CB 발행',
  bond_with_warrant: 'BW 발행',
  merger: '합병',
  split: '분할',
  stock_split: '액면분할',
  ceo_change: '대표이사 변경',
  large_shareholder: '대량보유 변동',
  earnings_preliminary: '실적 속보',
  business_transfer: '영업양수도',
};

export interface Disclosure {
  id: string;
  source: string;
  sourceId: string;
  corpCode: string;
  corpName: string;
  stockCode: string | null;
  disclosureType: DisclosureType | null;
  title: string;
  disclosedAt: string;
  sourceUrl: string;
}

export interface PatternStats {
  disclosureType: DisclosureType;
  period: '1w' | '1m' | '3m';
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

export interface DisclosureWithStats {
  disclosure: Disclosure;
  stats: PatternStats[];
}

export interface TypeSummary {
  type: DisclosureType;
  label: string;
  sampleCount: number;
  avgReturn1m: number | null;
  positiveRate1m: number | null;
}

export interface TodayResponse {
  date: string;
  disclosures: DisclosureWithStats[];
}

export interface TypesResponse {
  types: TypeSummary[];
}

export interface StatsResponse {
  type: DisclosureType;
  stats: PatternStats[];
}

export interface DetailResponse {
  disclosure: Disclosure;
  stats: PatternStats[];
}
