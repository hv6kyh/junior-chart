// backend/src/services/disclosure/types.ts

// --- 공시 유형 ---

export const DISCLOSURE_TYPES = {
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
} as const;

export type DisclosureType = keyof typeof DISCLOSURE_TYPES;

export function isValidDisclosureType(type: string): type is DisclosureType {
  return type in DISCLOSURE_TYPES;
}

// --- Provider 인터페이스 ---

export interface RawDisclosure {
  sourceId: string;
  corpCode: string;
  corpName: string;
  stockCode: string | null;
  title: string;
  disclosedAt: string; // YYYY-MM-DD
  sourceUrl: string;
  rawType: string;
}

export interface DisclosureProvider {
  source: 'dart' | 'edgar';
  fetchRecent(date: string): Promise<RawDisclosure[]>;
  fetchHistorical(from: string, to: string): Promise<RawDisclosure[]>;
  classifyType(raw: RawDisclosure): DisclosureType | null;
}

// --- DB 모델 ---

export interface Disclosure {
  id: string;
  source: string;
  sourceId: string;
  corpCode: string;
  corpName: string;
  stockCode: string | null;
  market: string | null; // Y=KOSPI, K=KOSDAQ
  disclosureType: DisclosureType | null;
  title: string;
  disclosedAt: string;
  sourceUrl: string;
  createdAt: string;
}

export interface DisclosurePrices {
  id: string;
  disclosureId: string;
  basePrice: number | null;
  price1w: number | null;
  price1m: number | null;
  price3m: number | null;
  return1w: number | null;
  return1m: number | null;
  return3m: number | null;
  calculatedAt: string;
}

export interface PatternStats {
  id: string;
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
  updatedAt: string;
}

// --- API 응답 ---

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
