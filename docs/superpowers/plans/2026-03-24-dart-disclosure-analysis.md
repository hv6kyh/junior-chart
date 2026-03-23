# DART 공시 기반 주가 패턴 분석 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DART 공시 발생 시 과거 유사 공시 이후 주가 변동 통계를 제공하는 서비스를 주린이 차트에 통합한다. Phase 1(데이터+엔진) → Phase 2(웹 대시보드) 순서로 구현.

**Architecture:** 공시 소스를 `DisclosureProvider` 인터페이스로 추상화하고, DART를 첫 번째 구현체로 제공. 독립적인 집계 통계 엔진이 유형별 수익률 분포를 산출. 배치 파이프라인은 GitHub Actions에서 평일 3회 실행. 프론트엔드는 Angular 21 lazy-loaded 모듈로 기존 서비스에 통합.

**Tech Stack:** Express 5 (ESM), Angular 21 standalone components, Supabase PostgreSQL, GitHub Actions, Yahoo Finance, DART Open API

**Spec:** `docs/superpowers/specs/2026-03-24-dart-disclosure-analysis-design.md`

---

## File Structure

### Backend — 새로 생성

| File | Responsibility |
|------|---------------|
| `backend/src/services/disclosure/types.ts` | 공시 도메인 공통 인터페이스 및 타입 |
| `backend/src/services/disclosure/providers/dart.provider.ts` | DART API 래퍼 + 공시 유형 분류 |
| `backend/src/services/disclosure/disclosure.service.ts` | 공시 CRUD — Supabase 조회/저장 |
| `backend/src/services/disclosure/analysis.service.ts` | 집계 통계 산출 (평균, 중앙값, 신뢰구간) |
| `backend/src/services/disclosure/batch.service.ts` | 배치 오케스트레이션 (수집→주가→통계) |
| `backend/src/routes/disclosure.routes.ts` | 공시 API 라우터 |
| `backend/scripts/collect-disclosures.ts` | 일일 공시 수집 스크립트 |
| `backend/scripts/update-prices.ts` | 주가 수익률 갱신 스크립트 |
| `backend/scripts/update-stats.ts` | 패턴 통계 갱신 스크립트 |
| `backend/scripts/backfill.ts` | 3년 백필 스크립트 (초기 1회) |
| `backend/tests/disclosure/types.test.ts` | 타입 가드/유틸 테스트 |
| `backend/tests/disclosure/dart.provider.test.ts` | DART Provider 테스트 |
| `backend/tests/disclosure/disclosure.service.test.ts` | 공시 서비스 테스트 |
| `backend/tests/disclosure/analysis.service.test.ts` | 분석 엔진 테스트 |
| `backend/tests/disclosure/batch.service.test.ts` | 배치 서비스 테스트 |

### Backend — 수정

| File | Change |
|------|--------|
| `backend/src/server.ts` | 공시 라우터 마운트 추가 |
| `backend/.env.example` | `DART_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` 추가 |

### Supabase — 새로 생성

| File | Responsibility |
|------|---------------|
| `supabase/migrations/001_disclosure_tables.sql` | disclosures, disclosure_prices, pattern_stats 테이블 |

### Frontend — 새로 생성

| File | Responsibility |
|------|---------------|
| `frontend/src/app/disclosure/disclosure.routes.ts` | 공시 모듈 라우트 정의 |
| `frontend/src/app/disclosure/services/disclosure.service.ts` | 공시 API 클라이언트 |
| `frontend/src/app/disclosure/types/disclosure.types.ts` | 프론트엔드 공시 타입 |
| `frontend/src/app/disclosure/disclosure-dashboard/disclosure-dashboard.component.ts` | 오늘의 공시 대시보드 |
| `frontend/src/app/disclosure/disclosure-dashboard/disclosure-dashboard.component.html` | 대시보드 템플릿 |
| `frontend/src/app/disclosure/disclosure-dashboard/disclosure-dashboard.component.css` | 대시보드 스타일 |
| `frontend/src/app/disclosure/disclosure-detail/disclosure-detail.component.ts` | 공시 상세 |
| `frontend/src/app/disclosure/disclosure-detail/disclosure-detail.component.html` | 상세 템플릿 |
| `frontend/src/app/disclosure/disclosure-detail/disclosure-detail.component.css` | 상세 스타일 |
| `frontend/src/app/disclosure/disclosure-type-stats/disclosure-type-stats.component.ts` | 유형별 통계 |
| `frontend/src/app/disclosure/disclosure-type-stats/disclosure-type-stats.component.html` | 유형별 템플릿 |
| `frontend/src/app/disclosure/disclosure-type-stats/disclosure-type-stats.component.css` | 유형별 스타일 |
| `frontend/src/app/disclosure/components/disclosure-card/disclosure-card.component.ts` | 공시 요약 카드 |
| `frontend/src/app/disclosure/components/disclosure-card/disclosure-card.component.html` | 카드 템플릿 |
| `frontend/src/app/disclosure/components/disclosure-card/disclosure-card.component.css` | 카드 스타일 |
| `frontend/src/app/disclosure/components/return-distribution/return-distribution.component.ts` | 수익률 분포 히스토그램 (SVG) |
| `frontend/src/app/disclosure/components/return-distribution/return-distribution.component.html` | 히스토그램 템플릿 |
| `frontend/src/app/disclosure/components/return-distribution/return-distribution.component.css` | 히스토그램 스타일 |
| `frontend/src/app/disclosure/components/period-stats-table/period-stats-table.component.ts` | 기간별 통계 테이블 |
| `frontend/src/app/disclosure/components/period-stats-table/period-stats-table.component.html` | 통계 테이블 템플릿 |
| `frontend/src/app/disclosure/components/period-stats-table/period-stats-table.component.css` | 통계 테이블 스타일 |
| `frontend/src/app/disclosure/components/type-badge/type-badge.component.ts` | 공시 유형 배지 |
| `frontend/src/app/disclosure/components/type-badge/type-badge.component.html` | 배지 템플릿 |
| `frontend/src/app/disclosure/components/type-badge/type-badge.component.css` | 배지 스타일 |

### Frontend — 수정

| File | Change |
|------|--------|
| `frontend/src/app/app.routes.ts` | 공시 모듈 lazy loading 추가 |
| `frontend/src/app/header/header.component.ts` | "공시 분석" 네비게이션 링크 추가 |
| `frontend/src/app/header/header.component.html` | "공시 분석" 메뉴 항목 추가 |

### GitHub Actions — 새로 생성

| File | Responsibility |
|------|---------------|
| `.github/workflows/disclosure-collect.yml` | 매일 09:00 KST 공시 수집 |
| `.github/workflows/disclosure-prices.yml` | 매일 18:00 KST 주가 갱신 |
| `.github/workflows/disclosure-stats.yml` | 매일 18:30 KST 통계 갱신 |

---

## Phase 1: 데이터 기반 + 분석 엔진

### Task 1: 의존성 설치 + Supabase 마이그레이션

**Files:**
- Create: `supabase/migrations/001_disclosure_tables.sql`

- [ ] **Step 0: 백엔드 의존성 설치**

```bash
cd backend && npm install @supabase/supabase-js
```

`@supabase/supabase-js`는 프론트엔드에는 이미 설치되어 있지만 백엔드에는 없으므로 추가 필요.

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- supabase/migrations/001_disclosure_tables.sql

-- 공시 테이블
CREATE TABLE disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'dart',
  source_id text NOT NULL,
  corp_code text NOT NULL,
  corp_name text NOT NULL,
  stock_code text,
  market text,  -- Y=KOSPI, K=KOSDAQ (Yahoo Finance 심볼 접미사 결정용)
  disclosure_type text,
  title text NOT NULL,
  disclosed_at date NOT NULL,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disclosures_source_id_unique UNIQUE (source, source_id)
);

CREATE INDEX idx_disclosures_type ON disclosures (disclosure_type);
CREATE INDEX idx_disclosures_date ON disclosures (disclosed_at DESC);
CREATE INDEX idx_disclosures_stock ON disclosures (stock_code);

-- 공시 기준 주가
CREATE TABLE disclosure_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_id uuid NOT NULL REFERENCES disclosures(id) ON DELETE CASCADE,
  base_price numeric,
  price_1w numeric,
  price_1m numeric,
  price_3m numeric,
  return_1w numeric,
  return_1m numeric,
  return_3m numeric,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disclosure_prices_disclosure_unique UNIQUE (disclosure_id)
);

-- 패턴 통계 캐시
CREATE TABLE pattern_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disclosure_type text NOT NULL,
  period text NOT NULL CHECK (period IN ('1w', '1m', '3m')),
  sample_count integer NOT NULL DEFAULT 0,
  avg_return numeric,
  median_return numeric,
  stddev numeric,
  positive_rate numeric,
  ci_lower_68 numeric,
  ci_upper_68 numeric,
  ci_lower_95 numeric,
  ci_upper_95 numeric,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pattern_stats_type_period_unique UNIQUE (disclosure_type, period)
);

-- 구독자 (Phase 3용, 미리 생성)
CREATE TABLE subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz
);
```

- [ ] **Step 2: Supabase에 마이그레이션 적용**

Run: `npx supabase db push` (또는 Supabase 대시보드 SQL Editor에서 직접 실행)
Expected: 4개 테이블 생성 완료

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/001_disclosure_tables.sql
git commit -m "db: 공시 분석 테이블 마이그레이션 추가 (disclosures, disclosure_prices, pattern_stats, subscribers)"
```

---

### Task 2: 공시 도메인 타입 정의

**Files:**
- Create: `backend/src/services/disclosure/types.ts`
- Create: `backend/tests/disclosure/types.test.ts`

- [ ] **Step 1: 타입 및 유틸 테스트 작성**

```typescript
// backend/tests/disclosure/types.test.ts
import {
  DISCLOSURE_TYPES,
  isValidDisclosureType,
  type DisclosureType,
} from '../../src/services/disclosure/types.js';

describe('Disclosure Types', () => {
  test('DISCLOSURE_TYPES에 13개 유형이 정의되어 있다', () => {
    expect(Object.keys(DISCLOSURE_TYPES)).toHaveLength(13);
  });

  test('isValidDisclosureType — 유효한 유형은 true', () => {
    expect(isValidDisclosureType('treasury_stock_acquire')).toBe(true);
    expect(isValidDisclosureType('convertible_bond')).toBe(true);
  });

  test('isValidDisclosureType — 유효하지 않은 유형은 false', () => {
    expect(isValidDisclosureType('unknown_type')).toBe(false);
    expect(isValidDisclosureType('')).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd backend && npm test -- --testPathPatterns=disclosure/types`
Expected: FAIL — 모듈 not found

- [ ] **Step 3: 타입 파일 구현**

```typescript
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd backend && npm test -- --testPathPatterns=disclosure/types`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/src/services/disclosure/types.ts backend/tests/disclosure/types.test.ts
git commit -m "feat(disclosure): 공시 도메인 타입 및 인터페이스 정의"
```

---

### Task 3: DART Provider 구현

**Files:**
- Create: `backend/src/services/disclosure/providers/dart.provider.ts`
- Create: `backend/tests/disclosure/dart.provider.test.ts`

- [ ] **Step 1: classifyType 테스트 작성**

```typescript
// backend/tests/disclosure/dart.provider.test.ts
import { DartProvider } from '../../src/services/disclosure/providers/dart.provider.js';
import type { RawDisclosure } from '../../src/services/disclosure/types.js';

describe('DartProvider', () => {
  let provider: DartProvider;

  beforeEach(() => {
    provider = new DartProvider('test-api-key');
  });

  describe('classifyType', () => {
    const makeRaw = (title: string): RawDisclosure => ({
      sourceId: 'test-001',
      corpCode: '00126380',
      corpName: '삼성전자',
      stockCode: '005930',
      title,
      disclosedAt: '2026-03-24',
      sourceUrl: 'https://dart.fss.or.kr/test',
      rawType: 'B001',
    });

    test('자기주식취득결정 → treasury_stock_acquire', () => {
      expect(provider.classifyType(makeRaw('자기주식취득결정'))).toBe('treasury_stock_acquire');
    });

    test('자기주식처분결정 → treasury_stock_dispose', () => {
      expect(provider.classifyType(makeRaw('자기주식처분결정'))).toBe('treasury_stock_dispose');
    });

    test('유상증자결정 → capital_increase', () => {
      expect(provider.classifyType(makeRaw('유상증자결정(주주배정)'))).toBe('capital_increase');
    });

    test('전환사채권발행결정 → convertible_bond', () => {
      expect(provider.classifyType(makeRaw('전환사채권발행결정'))).toBe('convertible_bond');
    });

    test('신주인수권부사채권발행결정 → bond_with_warrant', () => {
      expect(provider.classifyType(makeRaw('신주인수권부사채권발행결정'))).toBe('bond_with_warrant');
    });

    test('합병결정 → merger', () => {
      expect(provider.classifyType(makeRaw('합병결정'))).toBe('merger');
    });

    test('회사분할결정 → split', () => {
      expect(provider.classifyType(makeRaw('회사분할결정'))).toBe('split');
    });

    test('주식분할결정 (액면분할) → stock_split', () => {
      expect(provider.classifyType(makeRaw('주식분할결정'))).toBe('stock_split');
    });

    test('대표이사변경 → ceo_change', () => {
      expect(provider.classifyType(makeRaw('[정정]대표이사(대표집행임원)변경'))).toBe('ceo_change');
    });

    test('주요사항보고서(자본감소결정) → capital_decrease', () => {
      expect(provider.classifyType(makeRaw('주요사항보고서(자본감소결정)'))).toBe('capital_decrease');
    });

    test('임원ㆍ주요주주특정증권등소유상황보고서 → large_shareholder', () => {
      expect(provider.classifyType(makeRaw('임원ㆍ주요주주특정증권등소유상황보고서'))).toBe('large_shareholder');
    });

    test('영업(잠정)실적(공정공시) → earnings_preliminary', () => {
      expect(provider.classifyType(makeRaw('영업(잠정)실적(공정공시)'))).toBe('earnings_preliminary');
    });

    test('영업양수결정 → business_transfer', () => {
      expect(provider.classifyType(makeRaw('영업양수결정'))).toBe('business_transfer');
    });

    test('분류 불가 공시 → null', () => {
      expect(provider.classifyType(makeRaw('사업보고서 (2025.12)'))).toBeNull();
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd backend && npm test -- --testPathPatterns=disclosure/dart.provider`
Expected: FAIL — 모듈 not found

- [ ] **Step 3: DART Provider 구현**

```typescript
// backend/src/services/disclosure/providers/dart.provider.ts
import type { DisclosureProvider, DisclosureType, RawDisclosure } from '../types.js';

interface DartListItem {
  corp_code: string;
  corp_name: string;
  stock_code: string;
  report_nm: string;
  rcept_no: string;
  rcept_dt: string;
  corp_cls: string; // Y=KOSPI, K=KOSDAQ, N=KONEX, E=기타
  flr_nm: string;
}

interface DartListResponse {
  status: string;
  message: string;
  page_no: number;
  page_count: number;
  total_count: number;
  total_page: number;
  list: DartListItem[];
}

// 공시 제목 → 대분류 매핑 규칙 (순서 중요: 먼저 매칭되는 규칙 적용)
const CLASSIFICATION_RULES: Array<{
  test: (title: string) => boolean;
  type: DisclosureType;
}> = [
  { test: (t) => t.includes('자기주식') && t.includes('취득'), type: 'treasury_stock_acquire' },
  { test: (t) => t.includes('자기주식') && t.includes('처분'), type: 'treasury_stock_dispose' },
  { test: (t) => t.includes('유상증자') || (t.includes('주주배정') && t.includes('증자')), type: 'capital_increase' },
  { test: (t) => t.includes('자본감소') || t.includes('감자'), type: 'capital_decrease' },
  { test: (t) => t.includes('신주인수권부사채'), type: 'bond_with_warrant' },
  { test: (t) => t.includes('전환사채'), type: 'convertible_bond' },
  { test: (t) => t.includes('합병'), type: 'merger' },
  { test: (t) => t.includes('주식분할') || t.includes('액면분할'), type: 'stock_split' },
  { test: (t) => t.includes('분할') && !t.includes('주식분할') && !t.includes('액면분할'), type: 'split' },
  { test: (t) => t.includes('대표이사') || t.includes('대표집행임원'), type: 'ceo_change' },
  { test: (t) => t.includes('주요주주') || t.includes('대량보유'), type: 'large_shareholder' },
  { test: (t) => t.includes('잠정') && t.includes('실적') || t.includes('영업실적'), type: 'earnings_preliminary' },
  { test: (t) => t.includes('영업양수') || t.includes('영업양도'), type: 'business_transfer' },
];

const DART_BASE_URL = 'https://opendart.fss.or.kr/api';

export class DartProvider implements DisclosureProvider {
  source = 'dart' as const;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  classifyType(raw: RawDisclosure): DisclosureType | null {
    const title = raw.title;
    for (const rule of CLASSIFICATION_RULES) {
      if (rule.test(title)) {
        return rule.type;
      }
    }
    return null;
  }

  async fetchRecent(date: string): Promise<RawDisclosure[]> {
    const dateStr = date.replace(/-/g, '');
    return this.fetchList(dateStr, dateStr);
  }

  async fetchHistorical(from: string, to: string): Promise<RawDisclosure[]> {
    const fromStr = from.replace(/-/g, '');
    const toStr = to.replace(/-/g, '');
    return this.fetchList(fromStr, toStr);
  }

  private async fetchList(bgn_de: string, end_de: string): Promise<RawDisclosure[]> {
    const results: RawDisclosure[] = [];
    let pageNo = 1;
    let totalPage = 1;

    while (pageNo <= totalPage) {
      const url = new URL(`${DART_BASE_URL}/list.json`);
      url.searchParams.set('crtfc_key', this.apiKey);
      url.searchParams.set('bgn_de', bgn_de);
      url.searchParams.set('end_de', end_de);
      url.searchParams.set('page_no', String(pageNo));
      url.searchParams.set('page_count', '100');

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`DART API error: ${response.status} ${response.statusText}`);
      }

      const data: DartListResponse = await response.json();

      // status "013" = 조회결과 없음
      if (data.status === '013') {
        break;
      }

      if (data.status !== '000') {
        throw new Error(`DART API error: ${data.status} ${data.message}`);
      }

      totalPage = data.total_page;

      for (const item of data.list) {
        // 상장사만 (Y=KOSPI, K=KOSDAQ)
        if (item.corp_cls !== 'Y' && item.corp_cls !== 'K') continue;

        results.push({
          sourceId: item.rcept_no,
          corpCode: item.corp_code,
          corpName: item.corp_name,
          stockCode: item.stock_code || null,
          title: item.report_nm,
          disclosedAt: `${item.rcept_dt.slice(0, 4)}-${item.rcept_dt.slice(4, 6)}-${item.rcept_dt.slice(6, 8)}`,
          sourceUrl: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${item.rcept_no}`,
          rawType: item.corp_cls,
        });
      }

      pageNo++;
    }

    return results;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd backend && npm test -- --testPathPatterns=disclosure/dart.provider`
Expected: PASS (classifyType 테스트 14개)

- [ ] **Step 5: 커밋**

```bash
git add backend/src/services/disclosure/providers/dart.provider.ts backend/tests/disclosure/dart.provider.test.ts
git commit -m "feat(disclosure): DART Provider 구현 — API 래퍼 + 공시 유형 분류"
```

---

### Task 4: Disclosure Service 구현 (Supabase CRUD)

**Files:**
- Create: `backend/src/services/disclosure/disclosure.service.ts`
- Create: `backend/tests/disclosure/disclosure.service.test.ts`

- [ ] **Step 1: 서비스 테스트 작성**

Supabase 직접 호출은 통합 테스트이므로, Supabase 클라이언트를 주입받는 패턴으로 설계하고 모킹으로 단위 테스트.

```typescript
// backend/tests/disclosure/disclosure.service.test.ts
import { DisclosureService } from '../../src/services/disclosure/disclosure.service.js';
import type { RawDisclosure, DisclosureType } from '../../src/services/disclosure/types.js';

// Supabase 클라이언트 mock
const mockFrom = jest.fn();
const mockSupabase = { from: mockFrom } as any;

describe('DisclosureService', () => {
  let service: DisclosureService;

  beforeEach(() => {
    service = new DisclosureService(mockSupabase);
    jest.clearAllMocks();
  });

  test('saveDisclosures — 공시를 Supabase에 upsert한다', async () => {
    const mockUpsert = jest.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsert });

    const raws: Array<RawDisclosure & { classifiedType: DisclosureType | null }> = [
      {
        sourceId: 'test-001',
        corpCode: '00126380',
        corpName: '삼성전자',
        stockCode: '005930',
        title: '자기주식취득결정',
        disclosedAt: '2026-03-24',
        sourceUrl: 'https://dart.fss.or.kr/test',
        rawType: 'Y',
        classifiedType: 'treasury_stock_acquire',
      },
    ];

    await service.saveDisclosures('dart', raws);

    expect(mockFrom).toHaveBeenCalledWith('disclosures');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'dart',
          source_id: 'test-001',
          disclosure_type: 'treasury_stock_acquire',
        }),
      ]),
      { onConflict: 'source,source_id' }
    );
  });

  test('getTodayDisclosures — 오늘 공시 목록을 반환한다', async () => {
    const mockSelect = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [{ id: '1', title: '자기주식취득결정', disclosure_type: 'treasury_stock_acquire' }],
          error: null,
        }),
      }),
    });
    mockFrom.mockReturnValue({ select: mockSelect });

    const result = await service.getDisclosuresByDate('2026-03-24');
    expect(mockFrom).toHaveBeenCalledWith('disclosures');
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd backend && npm test -- --testPathPatterns=disclosure/disclosure.service`
Expected: FAIL

- [ ] **Step 3: Disclosure Service 구현**

```typescript
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
      market: item.rawType || null, // corp_cls: Y=KOSPI, K=KOSDAQ
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

    // 공시일로부터 충분한 영업일이 경과했지만 아직 가격이 채워지지 않은 공시 조회
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Math.ceil(businessDays * 1.5)); // 영업일 → 달력일 환산 (여유분 포함)

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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd backend && npm test -- --testPathPatterns=disclosure/disclosure.service`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/src/services/disclosure/disclosure.service.ts backend/tests/disclosure/disclosure.service.test.ts
git commit -m "feat(disclosure): Disclosure Service 구현 — Supabase CRUD"
```

---

### Task 5: Analysis Service 구현 (집계 통계 엔진)

**Files:**
- Create: `backend/src/services/disclosure/analysis.service.ts`
- Create: `backend/tests/disclosure/analysis.service.test.ts`

- [ ] **Step 1: 통계 계산 테스트 작성**

```typescript
// backend/tests/disclosure/analysis.service.test.ts
import { AnalysisService } from '../../src/services/disclosure/analysis.service.js';

describe('AnalysisService', () => {
  describe('calculateStats', () => {
    test('수익률 배열로 통계를 산출한다', () => {
      const returns = [5.0, -2.0, 8.0, 3.0, -1.0, 10.0, 4.0, 6.0, -3.0, 7.0];
      const stats = AnalysisService.calculateStats(returns);

      expect(stats.sampleCount).toBe(10);
      expect(stats.avgReturn).toBeCloseTo(3.7, 1);
      expect(stats.medianReturn).toBeCloseTo(4.5, 1);
      expect(stats.positiveRate).toBeCloseTo(0.7, 2);
      expect(stats.stddev).toBeGreaterThan(0);
      expect(stats.ciLower68).toBeLessThan(stats.avgReturn!);
      expect(stats.ciUpper68).toBeGreaterThan(stats.avgReturn!);
      expect(stats.ciLower95).toBeLessThan(stats.ciLower68!);
      expect(stats.ciUpper95).toBeGreaterThan(stats.ciUpper68!);
    });

    test('빈 배열은 null 통계를 반환한다', () => {
      const stats = AnalysisService.calculateStats([]);

      expect(stats.sampleCount).toBe(0);
      expect(stats.avgReturn).toBeNull();
      expect(stats.medianReturn).toBeNull();
    });

    test('표본 수 30 미만이면 t-분포 보정을 적용한다', () => {
      const smallSample = [5.0, -2.0, 8.0, 3.0, -1.0];
      const stats = AnalysisService.calculateStats(smallSample);

      // t-분포 보정으로 신뢰구간이 정규분포보다 넓어야 함
      expect(stats.sampleCount).toBe(5);
      expect(stats.ciUpper95! - stats.ciLower95!).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd backend && npm test -- --testPathPatterns=disclosure/analysis.service`
Expected: FAIL

- [ ] **Step 3: Analysis Service 구현**

```typescript
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

  async updatePatternStats(disclosureType: DisclosureType, period: '1w' | '1m' | '3m'): Promise<void> {
    const returnColumn = `return_${period}`;

    // 해당 유형의 수익률 데이터 조회
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
        { onConflict: 'disclosure_type,period' }
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

  async getAllTypesSummary(): Promise<Array<{ type: DisclosureType; label: string; sampleCount: number; avgReturn1m: number | null; positiveRate1m: number | null }>> {
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd backend && npm test -- --testPathPatterns=disclosure/analysis.service`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/src/services/disclosure/analysis.service.ts backend/tests/disclosure/analysis.service.test.ts
git commit -m "feat(disclosure): Analysis Service 구현 — 집계 통계 엔진 (t-분포 신뢰구간 포함)"
```

---

### Task 6: Batch Service 구현

**Files:**
- Create: `backend/src/services/disclosure/batch.service.ts`
- Create: `backend/tests/disclosure/batch.service.test.ts`

- [ ] **Step 1: 배치 오케스트레이션 테스트 작성**

```typescript
// backend/tests/disclosure/batch.service.test.ts
import { BatchService } from '../../src/services/disclosure/batch.service.js';

describe('BatchService', () => {
  test('collectDisclosures — provider에서 수집 후 분류하여 저장한다', async () => {
    const mockProvider = {
      source: 'dart' as const,
      fetchRecent: jest.fn().mockResolvedValue([
        {
          sourceId: '001',
          corpCode: '00126380',
          corpName: '삼성전자',
          stockCode: '005930',
          title: '자기주식취득결정',
          disclosedAt: '2026-03-24',
          sourceUrl: 'https://dart.fss.or.kr/test',
          rawType: 'Y',
        },
        {
          sourceId: '002',
          corpCode: '00164779',
          corpName: '비상장기업',
          stockCode: null,
          title: '사업보고서',
          disclosedAt: '2026-03-24',
          sourceUrl: 'https://dart.fss.or.kr/test2',
          rawType: 'E',
        },
      ]),
      classifyType: jest.fn()
        .mockReturnValueOnce('treasury_stock_acquire')
        .mockReturnValueOnce(null),
      fetchHistorical: jest.fn(),
    };

    const mockDisclosureService = {
      saveDisclosures: jest.fn().mockResolvedValue(undefined),
    };

    const batch = new BatchService(
      mockProvider as any,
      mockDisclosureService as any,
      null as any, // analysisService
      null as any, // supabase
    );

    const result = await batch.collectDisclosures('2026-03-24');

    expect(mockProvider.fetchRecent).toHaveBeenCalledWith('2026-03-24');
    expect(mockDisclosureService.saveDisclosures).toHaveBeenCalledWith(
      'dart',
      expect.arrayContaining([
        expect.objectContaining({ sourceId: '001', classifiedType: 'treasury_stock_acquire' }),
        expect.objectContaining({ sourceId: '002', classifiedType: null }),
      ])
    );
    expect(result.total).toBe(2);
    expect(result.classified).toBe(1);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd backend && npm test -- --testPathPatterns=disclosure/batch.service`
Expected: FAIL

- [ ] **Step 3: Batch Service 구현**

```typescript
// backend/src/services/disclosure/batch.service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import yahooFinance from 'yahoo-finance2';
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

    // 배치로 나눠서 저장 (한 번에 1000건씩)
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

          // market 필드 (Y=KOSPI→.KS, K=KOSDAQ→.KQ) 는 disclosures 테이블에서 조회
          const suffix = d.market === 'Y' ? '.KS' : '.KQ';
          const symbol = `${d.stockCode}${suffix}`;

          const baseDate = new Date(d.disclosedAt);
          const targetDate = new Date(baseDate);
          targetDate.setDate(targetDate.getDate() + daysMap[period]);

          // 기준가 + 목표일 주가 조회
          const quotes = await yahooFinance.chart(symbol, {
            period1: baseDate.toISOString().slice(0, 10),
            period2: new Date(targetDate.getTime() + 7 * 86400000).toISOString().slice(0, 10), // 여유분
            interval: '1d',
          });

          if (!quotes.quotes || quotes.quotes.length < 2) continue;

          const basePrice = quotes.quotes[0].close;
          const priceColumnMap = { '1w': 'price_1w', '1m': 'price_1m', '3m': 'price_3m' };
          const returnColumnMap = { '1w': 'return_1w', '1m': 'return_1m', '3m': 'return_3m' };
          const businessDaysMap = { '1w': 5, '1m': 21, '3m': 63 };

          // 영업일 수에 가장 가까운 데이터 포인트 사용
          const targetIdx = Math.min(businessDaysMap[period], quotes.quotes.length - 1);
          const targetPrice = quotes.quotes[targetIdx].close;

          if (basePrice == null || targetPrice == null) continue;

          const returnPct = ((targetPrice - basePrice) / basePrice) * 100;

          // disclosure_prices upsert
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

  private getYahooSymbol(stockCode: string, market: string): string {
    const suffix = market === 'Y' ? '.KS' : '.KQ';
    return `${stockCode}${suffix}`;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd backend && npm test -- --testPathPatterns=disclosure/batch.service`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend/src/services/disclosure/batch.service.ts backend/tests/disclosure/batch.service.test.ts
git commit -m "feat(disclosure): Batch Service 구현 — 수집/주가갱신/통계산출 오케스트레이션"
```

---

### Task 7: API 라우트 추가

**Files:**
- Create: `backend/src/routes/disclosure.routes.ts`
- Modify: `backend/src/server.ts`
- Modify: `backend/.env.example`

- [ ] **Step 1: 라우터 구현**

```typescript
// backend/src/routes/disclosure.routes.ts
import { Router, type Request, type Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { DisclosureService } from '../services/disclosure/disclosure.service.js';
import { AnalysisService } from '../services/disclosure/analysis.service.js';
import { isValidDisclosureType, type DisclosureType } from '../services/disclosure/types.js';

const router = Router();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const disclosureService = new DisclosureService(supabase);
const analysisService = new AnalysisService(supabase);

// GET /api/disclosures/today
router.get('/today', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const date = (req.query.date as string) || today;
    const disclosures = await disclosureService.getDisclosuresByDate(date);

    // 각 공시에 해당 유형의 1m 통계 첨부
    const withStats = await Promise.all(
      disclosures.map(async (d) => {
        const stats = d.disclosureType
          ? await analysisService.getStatsByType(d.disclosureType)
          : [];
        return { disclosure: d, stats };
      })
    );

    res.json({ date, disclosures: withStats });
  } catch (err: any) {
    console.error('GET /disclosures/today error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/disclosures/types
router.get('/types', async (_req: Request, res: Response) => {
  try {
    const summary = await analysisService.getAllTypesSummary();
    res.json({ types: summary });
  } catch (err: any) {
    console.error('GET /disclosures/types error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/disclosures/stats/:type
router.get('/stats/:type', async (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    if (!isValidDisclosureType(type)) {
      res.status(400).json({ error: `Invalid disclosure type: ${type}` });
      return;
    }

    const stats = await analysisService.getStatsByType(type as DisclosureType);
    res.json({ type, stats });
  } catch (err: any) {
    console.error('GET /disclosures/stats/:type error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/disclosures/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const disclosure = await disclosureService.getDisclosureById(req.params.id);
    if (!disclosure) {
      res.status(404).json({ error: 'Disclosure not found' });
      return;
    }

    const stats = disclosure.disclosureType
      ? await analysisService.getStatsByType(disclosure.disclosureType)
      : [];

    res.json({ disclosure, stats });
  } catch (err: any) {
    console.error('GET /disclosures/:id error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: server.ts에 라우터 마운트**

`backend/src/server.ts`에 추가:

```typescript
// 기존 import 영역에 추가
import disclosureRoutes from './routes/disclosure.routes.js';

// 기존 라우트 아래에 추가
app.use('/api/disclosures', disclosureRoutes);
```

- [ ] **Step 3: .env.example 업데이트**

`backend/.env.example`에 추가:

```
DART_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

- [ ] **Step 4: 서버 시작 확인**

Run: `cd backend && npm run build`
Expected: 컴파일 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add backend/src/routes/disclosure.routes.ts backend/src/server.ts backend/.env.example
git commit -m "feat(disclosure): API 엔드포인트 추가 — today, types, stats/:type, :id"
```

---

### Task 8: 배치 스크립트 작성

**Files:**
- Create: `backend/scripts/collect-disclosures.ts`
- Create: `backend/scripts/update-prices.ts`
- Create: `backend/scripts/update-stats.ts`
- Create: `backend/scripts/backfill.ts`

- [ ] **Step 1: 공시 수집 스크립트**

```typescript
// backend/scripts/collect-disclosures.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { DartProvider } from '../src/services/disclosure/providers/dart.provider.js';
import { DisclosureService } from '../src/services/disclosure/disclosure.service.js';
import { AnalysisService } from '../src/services/disclosure/analysis.service.js';
import { BatchService } from '../src/services/disclosure/batch.service.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const provider = new DartProvider(process.env.DART_API_KEY!);
const disclosureService = new DisclosureService(supabase);
const analysisService = new AnalysisService(supabase);
const batch = new BatchService(provider, disclosureService, analysisService, supabase);

// 어제 날짜 (배치는 오전에 실행되므로 전일 공시 수집)
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const dateStr = yesterday.toISOString().slice(0, 10);

console.log(`Collecting disclosures for ${dateStr}...`);
const result = await batch.collectDisclosures(dateStr);
console.log(`Done: ${result.total} total, ${result.classified} classified`);
```

- [ ] **Step 2: 주가 갱신 스크립트**

```typescript
// backend/scripts/update-prices.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { DartProvider } from '../src/services/disclosure/providers/dart.provider.js';
import { DisclosureService } from '../src/services/disclosure/disclosure.service.js';
import { AnalysisService } from '../src/services/disclosure/analysis.service.js';
import { BatchService } from '../src/services/disclosure/batch.service.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const provider = new DartProvider(process.env.DART_API_KEY!);
const disclosureService = new DisclosureService(supabase);
const analysisService = new AnalysisService(supabase);
const batch = new BatchService(provider, disclosureService, analysisService, supabase);

console.log('Updating disclosure prices...');
const result = await batch.updatePrices();
console.log(`Done: ${result.updated} updated, ${result.failed} failed`);
```

- [ ] **Step 3: 통계 갱신 스크립트**

```typescript
// backend/scripts/update-stats.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { DartProvider } from '../src/services/disclosure/providers/dart.provider.js';
import { DisclosureService } from '../src/services/disclosure/disclosure.service.js';
import { AnalysisService } from '../src/services/disclosure/analysis.service.js';
import { BatchService } from '../src/services/disclosure/batch.service.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const provider = new DartProvider(process.env.DART_API_KEY!);
const disclosureService = new DisclosureService(supabase);
const analysisService = new AnalysisService(supabase);
const batch = new BatchService(provider, disclosureService, analysisService, supabase);

console.log('Updating pattern stats...');
const result = await batch.updateAllStats();
console.log(`Done: ${result.updated} stats updated`);
```

- [ ] **Step 4: 백필 스크립트**

```typescript
// backend/scripts/backfill.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { DartProvider } from '../src/services/disclosure/providers/dart.provider.js';
import { DisclosureService } from '../src/services/disclosure/disclosure.service.js';
import { AnalysisService } from '../src/services/disclosure/analysis.service.js';
import { BatchService } from '../src/services/disclosure/batch.service.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const provider = new DartProvider(process.env.DART_API_KEY!);
const disclosureService = new DisclosureService(supabase);
const analysisService = new AnalysisService(supabase);
const batch = new BatchService(provider, disclosureService, analysisService, supabase);

// 3년 백필
const to = new Date();
const from = new Date();
from.setFullYear(from.getFullYear() - 3);

const toStr = to.toISOString().slice(0, 10);
const fromStr = from.toISOString().slice(0, 10);

console.log(`Backfilling disclosures from ${fromStr} to ${toStr}...`);

// 월 단위로 분할 호출 (DART API 페이지네이션 + rate limit 대응)
const current = new Date(from);
let totalCollected = 0;
let totalClassified = 0;

while (current < to) {
  const monthEnd = new Date(current);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0); // 해당 월 마지막 날
  if (monthEnd > to) monthEnd.setTime(to.getTime());

  const monthFrom = current.toISOString().slice(0, 10);
  const monthTo = monthEnd.toISOString().slice(0, 10);

  console.log(`  ${monthFrom} ~ ${monthTo}...`);
  const result = await batch.collectHistorical(monthFrom, monthTo);
  totalCollected += result.total;
  totalClassified += result.classified;
  console.log(`    → ${result.total} collected, ${result.classified} classified`);

  // 다음 달 1일로 이동
  current.setMonth(current.getMonth() + 1);
  current.setDate(1);

  // DART API rate limit 대응: 월 사이에 1초 대기
  await new Promise((r) => setTimeout(r, 1000));
}

console.log(`\nBackfill complete: ${totalCollected} total, ${totalClassified} classified`);

// 주가 수집
console.log('\nUpdating prices (this may take a while)...');
const priceResult = await batch.updatePrices();
console.log(`Prices: ${priceResult.updated} updated, ${priceResult.failed} failed`);

// 통계 산출
console.log('\nCalculating pattern stats...');
const statsResult = await batch.updateAllStats();
console.log(`Stats: ${statsResult.updated} stats calculated`);

console.log('\nBackfill pipeline complete!');
```

- [ ] **Step 5: 커밋**

```bash
git add backend/scripts/
git commit -m "feat(disclosure): 배치 스크립트 추가 — collect, update-prices, update-stats, backfill"
```

---

### Task 9: GitHub Actions 워크플로우

**Files:**
- Create: `.github/workflows/disclosure-collect.yml`
- Create: `.github/workflows/disclosure-prices.yml`
- Create: `.github/workflows/disclosure-stats.yml`

- [ ] **Step 1: 공시 수집 워크플로우**

```yaml
# .github/workflows/disclosure-collect.yml
name: Disclosure - Collect

on:
  schedule:
    - cron: '0 0 * * 1-5'  # UTC 00:00 = KST 09:00, 평일
  workflow_dispatch:  # 수동 실행 가능

jobs:
  collect:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npx tsx scripts/collect-disclosures.ts
        env:
          DART_API_KEY: ${{ secrets.DART_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

- [ ] **Step 2: 주가 수집 워크플로우**

```yaml
# .github/workflows/disclosure-prices.yml
name: Disclosure - Update Prices

on:
  schedule:
    - cron: '0 9 * * 1-5'  # UTC 09:00 = KST 18:00, 평일
  workflow_dispatch:

jobs:
  prices:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npx tsx scripts/update-prices.ts
        env:
          DART_API_KEY: ${{ secrets.DART_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

- [ ] **Step 3: 통계 갱신 워크플로우**

```yaml
# .github/workflows/disclosure-stats.yml
name: Disclosure - Update Stats

on:
  schedule:
    - cron: '30 9 * * 1-5'  # UTC 09:30 = KST 18:30, 평일
  workflow_dispatch:

jobs:
  stats:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npx tsx scripts/update-stats.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

- [ ] **Step 4: 커밋**

```bash
git add .github/workflows/disclosure-collect.yml .github/workflows/disclosure-prices.yml .github/workflows/disclosure-stats.yml
git commit -m "ci: 공시 배치 파이프라인 GitHub Actions 워크플로우 추가"
```

---

## Phase 2: 웹 대시보드

### Task 10: 프론트엔드 타입 + 서비스

**Files:**
- Create: `frontend/src/app/disclosure/types/disclosure.types.ts`
- Create: `frontend/src/app/disclosure/services/disclosure.service.ts`

- [ ] **Step 1: 프론트엔드 타입 정의**

```typescript
// frontend/src/app/disclosure/types/disclosure.types.ts

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
```

- [ ] **Step 2: API 서비스 구현**

```typescript
// frontend/src/app/disclosure/services/disclosure.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  TodayResponse,
  TypesResponse,
  StatsResponse,
  DetailResponse,
  DisclosureType,
} from '../types/disclosure.types';

@Injectable({ providedIn: 'root' })
export class DisclosureApiService {
  private baseUrl = `${environment.apiUrl}/disclosures`;

  constructor(private http: HttpClient) {}

  getToday(date?: string): Observable<TodayResponse> {
    const params = date ? { date } : {};
    return this.http.get<TodayResponse>(`${this.baseUrl}/today`, { params });
  }

  getTypes(): Observable<TypesResponse> {
    return this.http.get<TypesResponse>(`${this.baseUrl}/types`);
  }

  getStatsByType(type: DisclosureType): Observable<StatsResponse> {
    return this.http.get<StatsResponse>(`${this.baseUrl}/stats/${type}`);
  }

  getDetail(id: string): Observable<DetailResponse> {
    return this.http.get<DetailResponse>(`${this.baseUrl}/${id}`);
  }
}
```

- [ ] **Step 3: 커밋**

```bash
git add frontend/src/app/disclosure/types/ frontend/src/app/disclosure/services/
git commit -m "feat(disclosure/fe): 프론트엔드 타입 정의 + API 서비스"
```

---

### Task 11: 공유 하위 컴포넌트

**Files:**
- Create: `frontend/src/app/disclosure/components/type-badge/type-badge.component.ts`
- Create: `frontend/src/app/disclosure/components/type-badge/type-badge.component.html`
- Create: `frontend/src/app/disclosure/components/type-badge/type-badge.component.css`
- Create: `frontend/src/app/disclosure/components/period-stats-table/period-stats-table.component.ts`
- Create: `frontend/src/app/disclosure/components/period-stats-table/period-stats-table.component.html`
- Create: `frontend/src/app/disclosure/components/period-stats-table/period-stats-table.component.css`
- Create: `frontend/src/app/disclosure/components/return-distribution/return-distribution.component.ts`
- Create: `frontend/src/app/disclosure/components/return-distribution/return-distribution.component.html`
- Create: `frontend/src/app/disclosure/components/return-distribution/return-distribution.component.css`
- Create: `frontend/src/app/disclosure/components/disclosure-card/disclosure-card.component.ts`
- Create: `frontend/src/app/disclosure/components/disclosure-card/disclosure-card.component.html`
- Create: `frontend/src/app/disclosure/components/disclosure-card/disclosure-card.component.css`

이 태스크는 4개의 하위 컴포넌트를 순차적으로 구현합니다. 각 컴포넌트는 standalone으로, 기존 디자인 토큰(CSS 변수)을 사용합니다.

- [ ] **Step 1: TypeBadge 컴포넌트**

공시 유형을 색상 배지로 표시. Input: `type: DisclosureType`.

```typescript
// type-badge.component.ts
import { Component, Input } from '@angular/core';
import { DISCLOSURE_TYPE_LABELS, type DisclosureType } from '../../types/disclosure.types';

@Component({
  selector: 'app-type-badge',
  standalone: true,
  templateUrl: './type-badge.component.html',
  styleUrl: './type-badge.component.css',
})
export class TypeBadgeComponent {
  @Input({ required: true }) type!: DisclosureType;

  get label(): string {
    return DISCLOSURE_TYPE_LABELS[this.type] || this.type;
  }
}
```

```html
<!-- type-badge.component.html -->
<span class="badge" [attr.data-type]="type">{{ label }}</span>
```

```css
/* type-badge.component.css */
.badge {
  display: inline-block;
  padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  border-radius: 4px;
  font-size: var(--font-size-xs, 11px);
  font-weight: 600;
  background: var(--surface-secondary, #f2f4f6);
  color: var(--text-secondary, #6b7684);
}

.badge[data-type="treasury_stock_acquire"],
.badge[data-type="treasury_stock_dispose"] {
  background: #fef3f2;
  color: #b42318;
}

.badge[data-type="capital_increase"],
.badge[data-type="capital_decrease"] {
  background: #eff8ff;
  color: #175cd3;
}

.badge[data-type="convertible_bond"],
.badge[data-type="bond_with_warrant"] {
  background: #f9f5ff;
  color: #6941c6;
}

.badge[data-type="merger"],
.badge[data-type="split"],
.badge[data-type="stock_split"] {
  background: #ecfdf3;
  color: #067647;
}

.badge[data-type="earnings_preliminary"] {
  background: #fffaeb;
  color: #b54708;
}
```

- [ ] **Step 2: PeriodStatsTable 컴포넌트**

1주/1개월/3개월 통계를 테이블로 표시. Input: `stats: PatternStats[]`.

```typescript
// period-stats-table.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import type { PatternStats } from '../../types/disclosure.types';

@Component({
  selector: 'app-period-stats-table',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './period-stats-table.component.html',
  styleUrl: './period-stats-table.component.css',
})
export class PeriodStatsTableComponent {
  @Input({ required: true }) stats!: PatternStats[];

  get statsByPeriod(): Record<string, PatternStats | undefined> {
    const map: Record<string, PatternStats | undefined> = {};
    for (const s of this.stats) {
      map[s.period] = s;
    }
    return map;
  }

  periods = [
    { key: '1w', label: '1주' },
    { key: '1m', label: '1개월' },
    { key: '3m', label: '3개월' },
  ];

  formatReturn(val: number | null): string {
    if (val === null) return '-';
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  }

  formatRate(val: number | null): string {
    if (val === null) return '-';
    return `${(val * 100).toFixed(0)}%`;
  }

  isPositive(val: number | null): boolean {
    return val !== null && val > 0;
  }

  isNegative(val: number | null): boolean {
    return val !== null && val < 0;
  }
}
```

```html
<!-- period-stats-table.component.html -->
<table class="stats-table">
  <thead>
    <tr>
      <th></th>
      @for (p of periods; track p.key) {
        <th>{{ p.label }}</th>
      }
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="label">평균 수익률</td>
      @for (p of periods; track p.key) {
        <td [class.positive]="isPositive(statsByPeriod[p.key]?.avgReturn ?? null)"
            [class.negative]="isNegative(statsByPeriod[p.key]?.avgReturn ?? null)">
          {{ formatReturn(statsByPeriod[p.key]?.avgReturn ?? null) }}
        </td>
      }
    </tr>
    <tr>
      <td class="label">중앙값</td>
      @for (p of periods; track p.key) {
        <td [class.positive]="isPositive(statsByPeriod[p.key]?.medianReturn ?? null)"
            [class.negative]="isNegative(statsByPeriod[p.key]?.medianReturn ?? null)">
          {{ formatReturn(statsByPeriod[p.key]?.medianReturn ?? null) }}
        </td>
      }
    </tr>
    <tr>
      <td class="label">상승 확률</td>
      @for (p of periods; track p.key) {
        <td>{{ formatRate(statsByPeriod[p.key]?.positiveRate ?? null) }}</td>
      }
    </tr>
    <tr>
      <td class="label">표본 수</td>
      @for (p of periods; track p.key) {
        <td>{{ statsByPeriod[p.key]?.sampleCount ?? '-' }}건</td>
      }
    </tr>
  </tbody>
</table>
```

```css
/* period-stats-table.component.css */
.stats-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm, 13px);
}

.stats-table th,
.stats-table td {
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  text-align: right;
  border-bottom: 1px solid var(--border-color, #e5e8eb);
}

.stats-table th {
  font-weight: 600;
  color: var(--text-secondary, #6b7684);
}

.stats-table td.label {
  text-align: left;
  font-weight: 500;
  color: var(--text-primary, #191f28);
}

.positive { color: var(--positive-color, #f04452); }
.negative { color: var(--negative-color, #3182f6); }
```

- [ ] **Step 3: ReturnDistribution 컴포넌트 (SVG 히스토그램)**

순수 SVG로 수익률 분포를 시각화. Input: `avgReturn`, `stddev`, `positiveRate`, `sampleCount`.
정규분포 근사로 히스토그램 형태를 생성 (실제 개별 데이터는 프론트에 전달하지 않으므로).

```typescript
// return-distribution.component.ts
import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Bar {
  x: number;
  height: number;
  label: string;
  isPositive: boolean;
}

@Component({
  selector: 'app-return-distribution',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './return-distribution.component.html',
  styleUrl: './return-distribution.component.css',
})
export class ReturnDistributionComponent implements OnChanges {
  @Input() avgReturn: number | null = null;
  @Input() stddev: number | null = null;
  @Input() sampleCount: number = 0;

  bars: Bar[] = [];
  svgWidth = 300;
  svgHeight = 120;
  barWidth = 24;

  ngOnChanges(): void {
    this.generateBars();
  }

  private generateBars(): void {
    if (this.avgReturn === null || this.stddev === null || this.sampleCount < 2) {
      this.bars = [];
      return;
    }

    const mean = this.avgReturn;
    const sd = Math.max(this.stddev, 1);
    const bins = 10;
    const range = 3 * sd;
    const start = mean - range;
    const binWidth = (2 * range) / bins;

    this.bars = Array.from({ length: bins }, (_, i) => {
      const binCenter = start + (i + 0.5) * binWidth;
      const z = (binCenter - mean) / sd;
      const density = Math.exp(-0.5 * z * z);
      return {
        x: i * (this.barWidth + 4),
        height: density * 80,
        label: `${binCenter >= 0 ? '+' : ''}${binCenter.toFixed(0)}%`,
        isPositive: binCenter >= 0,
      };
    });

    this.svgWidth = bins * (this.barWidth + 4);
  }
}
```

```html
<!-- return-distribution.component.html -->
@if (bars.length > 0) {
  <div class="distribution">
    <svg [attr.width]="svgWidth" [attr.height]="svgHeight" class="chart">
      @for (bar of bars; track bar.x) {
        <rect
          [attr.x]="bar.x"
          [attr.y]="svgHeight - bar.height - 20"
          [attr.width]="barWidth"
          [attr.height]="bar.height"
          [class.bar-positive]="bar.isPositive"
          [class.bar-negative]="!bar.isPositive"
          rx="2"
        />
        <text
          [attr.x]="bar.x + barWidth / 2"
          [attr.y]="svgHeight - 4"
          class="bar-label"
          text-anchor="middle">
          {{ bar.label }}
        </text>
      }
    </svg>
  </div>
} @else {
  <p class="no-data">데이터 부족</p>
}
```

```css
/* return-distribution.component.css */
.distribution {
  overflow-x: auto;
  padding: var(--spacing-sm, 8px) 0;
}

.chart { display: block; margin: 0 auto; }

.bar-positive { fill: var(--positive-color, #f04452); opacity: 0.7; }
.bar-negative { fill: var(--negative-color, #3182f6); opacity: 0.7; }

.bar-label {
  font-size: 9px;
  fill: var(--text-tertiary, #8b95a1);
}

.no-data {
  text-align: center;
  color: var(--text-tertiary, #8b95a1);
  font-size: var(--font-size-sm, 13px);
  padding: var(--spacing-xl, 32px);
}
```

- [ ] **Step 4: DisclosureCard 컴포넌트**

공시 요약 카드 (대시보드 목록용). Input: `item: DisclosureWithStats`.

```typescript
// disclosure-card.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TypeBadgeComponent } from '../type-badge/type-badge.component';
import type { DisclosureWithStats, PatternStats } from '../../types/disclosure.types';

@Component({
  selector: 'app-disclosure-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TypeBadgeComponent],
  templateUrl: './disclosure-card.component.html',
  styleUrl: './disclosure-card.component.css',
})
export class DisclosureCardComponent {
  @Input({ required: true }) item!: DisclosureWithStats;

  get stat1m(): PatternStats | undefined {
    return this.item.stats.find((s) => s.period === '1m');
  }

  formatReturn(val: number | null): string {
    if (val === null) return '-';
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  }

  formatRate(val: number | null): string {
    if (val === null) return '-';
    return `${(val * 100).toFixed(0)}%`;
  }
}
```

```html
<!-- disclosure-card.component.html -->
<div class="card" [routerLink]="['/disclosure', item.disclosure.id]">
  <div class="card-header">
    <span class="corp-name">{{ item.disclosure.corpName }}</span>
    @if (item.disclosure.disclosureType) {
      <app-type-badge [type]="item.disclosure.disclosureType" />
    }
  </div>
  <p class="title">{{ item.disclosure.title }}</p>
  @if (stat1m) {
    <div class="stats-summary">
      <span>과거 {{ stat1m.sampleCount }}건</span>
      <span class="divider">|</span>
      <span>1개월 평균 <strong [class.positive]="(stat1m.avgReturn ?? 0) > 0"
                               [class.negative]="(stat1m.avgReturn ?? 0) < 0">
        {{ formatReturn(stat1m.avgReturn) }}
      </strong></span>
      <span class="divider">|</span>
      <span>상승 {{ formatRate(stat1m.positiveRate) }}</span>
    </div>
  } @else {
    <div class="stats-summary no-stats">통계 데이터 없음</div>
  }
</div>
```

```css
/* disclosure-card.component.css */
.card {
  padding: var(--spacing-lg, 20px);
  border: 1px solid var(--border-color, #e5e8eb);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.card:hover {
  border-color: var(--text-tertiary, #8b95a1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-xs, 4px);
}

.corp-name {
  font-weight: 600;
  font-size: var(--font-size-md, 15px);
  color: var(--text-primary, #191f28);
}

.title {
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #6b7684);
  margin: var(--spacing-xs, 4px) 0 var(--spacing-md, 16px);
}

.stats-summary {
  font-size: var(--font-size-sm, 13px);
  color: var(--text-secondary, #6b7684);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
}

.divider { color: var(--border-color, #e5e8eb); }
.no-stats { font-style: italic; }
.positive { color: var(--positive-color, #f04452); }
.negative { color: var(--negative-color, #3182f6); }
```

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/app/disclosure/components/
git commit -m "feat(disclosure/fe): 공유 컴포넌트 추가 — TypeBadge, PeriodStatsTable, ReturnDistribution, DisclosureCard"
```

---

### Task 12: 공시 대시보드 페이지

**Files:**
- Create: `frontend/src/app/disclosure/disclosure-dashboard/disclosure-dashboard.component.ts`
- Create: `frontend/src/app/disclosure/disclosure-dashboard/disclosure-dashboard.component.html`
- Create: `frontend/src/app/disclosure/disclosure-dashboard/disclosure-dashboard.component.css`

- [ ] **Step 1: 대시보드 컴포넌트 구현**

```typescript
// disclosure-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DisclosureApiService } from '../services/disclosure.service';
import { DisclosureCardComponent } from '../components/disclosure-card/disclosure-card.component';
import { TypeBadgeComponent } from '../components/type-badge/type-badge.component';
import { DisclaimerComponent } from '../../components/disclaimer/disclaimer.component';
import type {
  DisclosureWithStats,
  TypeSummary,
  DisclosureType,
} from '../types/disclosure.types';

@Component({
  selector: 'app-disclosure-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DisclosureCardComponent, TypeBadgeComponent, DisclaimerComponent],
  templateUrl: './disclosure-dashboard.component.html',
  styleUrl: './disclosure-dashboard.component.css',
})
export class DisclosureDashboardComponent implements OnInit {
  disclosures: DisclosureWithStats[] = [];
  typeSummaries: TypeSummary[] = [];
  loading = true;
  error: string | null = null;
  selectedType: DisclosureType | null = null;
  today = new Date().toISOString().slice(0, 10);

  constructor(private api: DisclosureApiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const [todayRes, typesRes] = await Promise.all([
        firstValueFrom(this.api.getToday()),
        firstValueFrom(this.api.getTypes()),
      ]);

      this.disclosures = todayRes?.disclosures ?? [];
      this.typeSummaries = typesRes?.types ?? [];
    } catch (err: any) {
      this.error = err.message || '데이터를 불러오는데 실패했습니다.';
    } finally {
      this.loading = false;
    }
  }

  get filteredDisclosures(): DisclosureWithStats[] {
    if (!this.selectedType) return this.disclosures;
    return this.disclosures.filter(
      (d) => d.disclosure.disclosureType === this.selectedType
    );
  }

  toggleTypeFilter(type: DisclosureType): void {
    this.selectedType = this.selectedType === type ? null : type;
  }

  formatReturn(val: number | null): string {
    if (val === null) return '-';
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(1)}%`;
  }
}
```

```html
<!-- disclosure-dashboard.component.html -->
<div class="dashboard">
  <header class="page-header">
    <h1>오늘의 공시</h1>
    <span class="date">{{ today }}</span>
  </header>

  @if (loading) {
    <div class="loading">불러오는 중...</div>
  } @else if (error) {
    <div class="error">{{ error }}</div>
  } @else {
    <!-- 오늘의 공시 목록 -->
    <section class="today-section">
      @if (disclosures.length === 0) {
        <p class="empty">오늘 수집된 공시가 없습니다.</p>
      } @else {
        <div class="filter-bar">
          <button
            class="filter-btn"
            [class.active]="!selectedType"
            (click)="selectedType = null">
            전체 ({{ disclosures.length }})
          </button>
        </div>

        <div class="card-list">
          @for (item of filteredDisclosures; track item.disclosure.id) {
            <app-disclosure-card [item]="item" />
          }
        </div>
      }
    </section>

    <!-- 공시 유형별 탐색 -->
    <section class="types-section">
      <h2>공시 유형별 탐색</h2>
      <div class="type-grid">
        @for (ts of typeSummaries; track ts.type) {
          <a class="type-card" [routerLink]="['/disclosure/type', ts.type]">
            <app-type-badge [type]="ts.type" />
            <span class="sample-count">{{ ts.sampleCount }}건</span>
            <span class="avg-return"
                  [class.positive]="(ts.avgReturn1m ?? 0) > 0"
                  [class.negative]="(ts.avgReturn1m ?? 0) < 0">
              평균 {{ formatReturn(ts.avgReturn1m) }}
            </span>
          </a>
        }
      </div>
    </section>

    <app-disclaimer />
  }
</div>
```

```css
/* disclosure-dashboard.component.css */
.dashboard {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-xl, 32px) var(--spacing-lg, 20px);
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-md, 16px);
  margin-bottom: var(--spacing-xl, 32px);
}

.page-header h1 {
  font-size: var(--font-size-2xl, 28px);
  font-weight: 700;
  color: var(--text-primary, #191f28);
  margin: 0;
}

.date {
  font-size: var(--font-size-md, 15px);
  color: var(--text-tertiary, #8b95a1);
}

.loading, .error, .empty {
  text-align: center;
  padding: var(--spacing-3xl, 48px);
  color: var(--text-tertiary, #8b95a1);
}

.error { color: var(--positive-color, #f04452); }

.card-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md, 16px);
}

.filter-bar {
  margin-bottom: var(--spacing-lg, 20px);
}

.filter-btn {
  padding: var(--spacing-xs, 4px) var(--spacing-md, 16px);
  border: 1px solid var(--border-color, #e5e8eb);
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  font-size: var(--font-size-sm, 13px);
}

.filter-btn.active {
  background: var(--text-primary, #191f28);
  color: white;
  border-color: transparent;
}

.types-section {
  margin-top: var(--spacing-3xl, 48px);
}

.types-section h2 {
  font-size: var(--font-size-xl, 22px);
  font-weight: 600;
  margin-bottom: var(--spacing-lg, 20px);
}

.type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing-md, 16px);
}

.type-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 4px);
  padding: var(--spacing-lg, 20px);
  border: 1px solid var(--border-color, #e5e8eb);
  border-radius: 8px;
  text-decoration: none;
  transition: border-color 0.15s;
}

.type-card:hover {
  border-color: var(--text-tertiary, #8b95a1);
}

.sample-count {
  font-size: var(--font-size-sm, 13px);
  color: var(--text-tertiary, #8b95a1);
}

.avg-return { font-size: var(--font-size-md, 15px); font-weight: 600; }
.positive { color: var(--positive-color, #f04452); }
.negative { color: var(--negative-color, #3182f6); }
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/app/disclosure/disclosure-dashboard/
git commit -m "feat(disclosure/fe): 공시 대시보드 페이지 구현"
```

---

### Task 13: 공시 상세 페이지

**Files:**
- Create: `frontend/src/app/disclosure/disclosure-detail/disclosure-detail.component.ts`
- Create: `frontend/src/app/disclosure/disclosure-detail/disclosure-detail.component.html`
- Create: `frontend/src/app/disclosure/disclosure-detail/disclosure-detail.component.css`

- [ ] **Step 1: 상세 컴포넌트 구현**

```typescript
// disclosure-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DisclosureApiService } from '../services/disclosure.service';
import { TypeBadgeComponent } from '../components/type-badge/type-badge.component';
import { PeriodStatsTableComponent } from '../components/period-stats-table/period-stats-table.component';
import { ReturnDistributionComponent } from '../components/return-distribution/return-distribution.component';
import { DisclaimerComponent } from '../../components/disclaimer/disclaimer.component';
import { DISCLOSURE_TYPE_LABELS, type Disclosure, type PatternStats } from '../types/disclosure.types';

@Component({
  selector: 'app-disclosure-detail',
  standalone: true,
  imports: [
    CommonModule,
    TypeBadgeComponent,
    PeriodStatsTableComponent,
    ReturnDistributionComponent,
    DisclaimerComponent,
  ],
  templateUrl: './disclosure-detail.component.html',
  styleUrl: './disclosure-detail.component.css',
})
export class DisclosureDetailComponent implements OnInit {
  disclosure: Disclosure | null = null;
  stats: PatternStats[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private api: DisclosureApiService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadDetail(id);
  }

  async loadDetail(id: string): Promise<void> {
    this.loading = true;
    try {
      const res = await firstValueFrom(this.api.getDetail(id));
      this.disclosure = res?.disclosure ?? null;
      this.stats = res?.stats ?? [];
    } catch (err: any) {
      this.error = err.message || '데이터를 불러오는데 실패했습니다.';
    } finally {
      this.loading = false;
    }
  }

  get stat1m(): PatternStats | undefined {
    return this.stats.find((s) => s.period === '1m');
  }

  get typeLabel(): string {
    if (!this.disclosure?.disclosureType) return '';
    return DISCLOSURE_TYPE_LABELS[this.disclosure.disclosureType] || '';
  }
}
```

```html
<!-- disclosure-detail.component.html -->
<div class="detail">
  @if (loading) {
    <div class="loading">불러오는 중...</div>
  } @else if (error) {
    <div class="error">{{ error }}</div>
  } @else if (disclosure) {
    <header class="detail-header">
      <h1>{{ disclosure.corpName }}</h1>
      <p class="title">{{ disclosure.title }}</p>
      <div class="meta">
        @if (disclosure.disclosureType) {
          <app-type-badge [type]="disclosure.disclosureType" />
        }
        <span class="date">{{ disclosure.disclosedAt }}</span>
        <a [href]="disclosure.sourceUrl" target="_blank" rel="noopener" class="dart-link">
          DART 원문 보기
        </a>
      </div>
    </header>

    @if (stats.length > 0) {
      <section class="analysis">
        <h2>과거 "{{ typeLabel }}" 공시 분석 결과</h2>

        <app-period-stats-table [stats]="stats" />

        @if (stat1m) {
          <h3>수익률 분포 (1개월)</h3>
          <app-return-distribution
            [avgReturn]="stat1m.avgReturn"
            [stddev]="stat1m.stddev"
            [sampleCount]="stat1m.sampleCount"
          />
        }
      </section>
    } @else {
      <p class="no-stats">이 공시 유형의 패턴 통계가 아직 없습니다.</p>
    }

    <app-disclaimer />
  }
</div>
```

```css
/* disclosure-detail.component.css */
.detail {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-xl, 32px) var(--spacing-lg, 20px);
}

.detail-header { margin-bottom: var(--spacing-xl, 32px); }

.detail-header h1 {
  font-size: var(--font-size-2xl, 28px);
  font-weight: 700;
  margin: 0 0 var(--spacing-xs, 4px);
}

.title {
  font-size: var(--font-size-md, 15px);
  color: var(--text-secondary, #6b7684);
  margin: 0 0 var(--spacing-md, 16px);
}

.meta {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 16px);
  font-size: var(--font-size-sm, 13px);
}

.date { color: var(--text-tertiary, #8b95a1); }

.dart-link {
  color: var(--negative-color, #3182f6);
  text-decoration: none;
}

.dart-link:hover { text-decoration: underline; }

.analysis h2 {
  font-size: var(--font-size-xl, 22px);
  font-weight: 600;
  margin-bottom: var(--spacing-lg, 20px);
}

.analysis h3 {
  font-size: var(--font-size-lg, 18px);
  font-weight: 600;
  margin: var(--spacing-xl, 32px) 0 var(--spacing-md, 16px);
}

.loading, .error, .no-stats {
  text-align: center;
  padding: var(--spacing-3xl, 48px);
  color: var(--text-tertiary, #8b95a1);
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/app/disclosure/disclosure-detail/
git commit -m "feat(disclosure/fe): 공시 상세 페이지 구현"
```

---

### Task 14: 유형별 통계 페이지

**Files:**
- Create: `frontend/src/app/disclosure/disclosure-type-stats/disclosure-type-stats.component.ts`
- Create: `frontend/src/app/disclosure/disclosure-type-stats/disclosure-type-stats.component.html`
- Create: `frontend/src/app/disclosure/disclosure-type-stats/disclosure-type-stats.component.css`

- [ ] **Step 1: 유형별 통계 컴포넌트 구현**

```typescript
// disclosure-type-stats.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { DisclosureApiService } from '../services/disclosure.service';
import { TypeBadgeComponent } from '../components/type-badge/type-badge.component';
import { PeriodStatsTableComponent } from '../components/period-stats-table/period-stats-table.component';
import { ReturnDistributionComponent } from '../components/return-distribution/return-distribution.component';
import { DisclaimerComponent } from '../../components/disclaimer/disclaimer.component';
import {
  DISCLOSURE_TYPE_LABELS,
  type DisclosureType,
  type PatternStats,
} from '../types/disclosure.types';

@Component({
  selector: 'app-disclosure-type-stats',
  standalone: true,
  imports: [
    CommonModule,
    TypeBadgeComponent,
    PeriodStatsTableComponent,
    ReturnDistributionComponent,
    DisclaimerComponent,
  ],
  templateUrl: './disclosure-type-stats.component.html',
  styleUrl: './disclosure-type-stats.component.css',
})
export class DisclosureTypeStatsComponent implements OnInit {
  type: DisclosureType | null = null;
  typeLabel = '';
  stats: PatternStats[] = [];
  selectedPeriod: '1w' | '1m' | '3m' = '1m';
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private api: DisclosureApiService,
  ) {}

  ngOnInit(): void {
    const type = this.route.snapshot.paramMap.get('type') as DisclosureType;
    if (type) {
      this.type = type;
      this.typeLabel = DISCLOSURE_TYPE_LABELS[type] || type;
      this.loadStats(type);
    }
  }

  async loadStats(type: DisclosureType): Promise<void> {
    this.loading = true;
    try {
      const res = await firstValueFrom(this.api.getStatsByType(type));
      this.stats = res?.stats ?? [];
    } catch (err: any) {
      this.error = err.message || '데이터를 불러오는데 실패했습니다.';
    } finally {
      this.loading = false;
    }
  }

  get currentStat(): PatternStats | undefined {
    return this.stats.find((s) => s.period === this.selectedPeriod);
  }

  periods: Array<{ key: '1w' | '1m' | '3m'; label: string }> = [
    { key: '1w', label: '1주' },
    { key: '1m', label: '1개월' },
    { key: '3m', label: '3개월' },
  ];
}
```

```html
<!-- disclosure-type-stats.component.html -->
<div class="type-stats">
  @if (loading) {
    <div class="loading">불러오는 중...</div>
  } @else if (error) {
    <div class="error">{{ error }}</div>
  } @else if (type) {
    <header class="page-header">
      <app-type-badge [type]="type" />
      <h1>{{ typeLabel }} — 전체 통계</h1>
    </header>

    <app-period-stats-table [stats]="stats" />

    <section class="distribution-section">
      <div class="period-tabs">
        @for (p of periods; track p.key) {
          <button
            class="tab"
            [class.active]="selectedPeriod === p.key"
            (click)="selectedPeriod = p.key">
            {{ p.label }}
          </button>
        }
      </div>

      @if (currentStat) {
        <h3>수익률 분포 ({{ selectedPeriod === '1w' ? '1주' : selectedPeriod === '1m' ? '1개월' : '3개월' }})</h3>
        <app-return-distribution
          [avgReturn]="currentStat.avgReturn"
          [stddev]="currentStat.stddev"
          [sampleCount]="currentStat.sampleCount"
        />
      }
    </section>

    <app-disclaimer />
  }
</div>
```

```css
/* disclosure-type-stats.component.css */
.type-stats {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-xl, 32px) var(--spacing-lg, 20px);
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md, 16px);
  margin-bottom: var(--spacing-xl, 32px);
}

.page-header h1 {
  font-size: var(--font-size-2xl, 28px);
  font-weight: 700;
  margin: 0;
}

.distribution-section {
  margin-top: var(--spacing-xl, 32px);
}

.distribution-section h3 {
  font-size: var(--font-size-lg, 18px);
  font-weight: 600;
  margin: var(--spacing-lg, 20px) 0 var(--spacing-md, 16px);
}

.period-tabs {
  display: flex;
  gap: var(--spacing-xs, 4px);
}

.tab {
  padding: var(--spacing-sm, 8px) var(--spacing-lg, 20px);
  border: 1px solid var(--border-color, #e5e8eb);
  border-radius: 20px;
  background: transparent;
  cursor: pointer;
  font-size: var(--font-size-sm, 13px);
}

.tab.active {
  background: var(--text-primary, #191f28);
  color: white;
  border-color: transparent;
}

.loading, .error {
  text-align: center;
  padding: var(--spacing-3xl, 48px);
  color: var(--text-tertiary, #8b95a1);
}
```

- [ ] **Step 2: 커밋**

```bash
git add frontend/src/app/disclosure/disclosure-type-stats/
git commit -m "feat(disclosure/fe): 유형별 통계 페이지 구현"
```

---

### Task 15: 라우팅 + 네비게이션 통합

**Files:**
- Create: `frontend/src/app/disclosure/disclosure.routes.ts`
- Modify: `frontend/src/app/app.routes.ts`
- Modify: `frontend/src/app/header/header.component.html`

- [ ] **Step 1: 공시 모듈 라우트 정의**

```typescript
// frontend/src/app/disclosure/disclosure.routes.ts
import type { Routes } from '@angular/router';
import { DisclosureDashboardComponent } from './disclosure-dashboard/disclosure-dashboard.component';
import { DisclosureDetailComponent } from './disclosure-detail/disclosure-detail.component';
import { DisclosureTypeStatsComponent } from './disclosure-type-stats/disclosure-type-stats.component';

export default [
  {
    path: '',
    component: DisclosureDashboardComponent,
    data: {
      title: '공시 분석 — 주린이 차트',
      description: 'DART 공시 발생 시 과거 유사 공시 이후 주가 변동 통계를 제공합니다.',
      keywords: '공시,DART,주가분석,자사주,유상증자,전환사채',
    },
  },
  {
    path: 'type/:type',
    component: DisclosureTypeStatsComponent,
    data: {
      title: '공시 유형별 통계 — 주린이 차트',
      description: '공시 유형별 주가 변동 패턴 전체 통계를 확인하세요.',
    },
  },
  {
    path: ':id',
    component: DisclosureDetailComponent,
    data: {
      title: '공시 상세 — 주린이 차트',
      description: '특정 공시의 과거 유사 사례 주가 변동 패턴 분석',
    },
  },
] satisfies Routes;
```

- [ ] **Step 2: app.routes.ts에 lazy loading 추가**

`frontend/src/app/app.routes.ts`에 추가:

```typescript
// 기존 routes 배열에 추가
{
  path: 'disclosure',
  loadChildren: () => import('./disclosure/disclosure.routes'),
  data: {
    title: '공시 분석 — 주린이 차트',
    description: 'DART 공시 기반 주가 패턴 분석',
  },
},
```

- [ ] **Step 3: 헤더에 네비게이션 추가**

`frontend/src/app/header/header.component.html`에 기존 메뉴 항목 옆에 추가:

```html
<a routerLink="/disclosure" routerLinkActive="active">공시 분석</a>
```

- [ ] **Step 4: 빌드 확인**

Run: `cd frontend && npx ng build`
Expected: 컴파일 에러 없음. disclosure 모듈이 별도 chunk로 분리됨.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/app/disclosure/disclosure.routes.ts frontend/src/app/app.routes.ts frontend/src/app/header/
git commit -m "feat(disclosure/fe): 라우팅 통합 + 헤더 네비게이션 추가 (lazy loaded)"
```

---

### Task 16: 수동 통합 테스트

코드 작성이 끝났으므로 전체 흐름을 수동으로 검증합니다.

- [ ] **Step 1: 백엔드 테스트 전체 실행**

Run: `cd backend && npm test`
Expected: 모든 테스트 PASS

- [ ] **Step 2: 프론트엔드 빌드**

Run: `cd frontend && npx ng build`
Expected: 빌드 성공, disclosure chunk 분리 확인

- [ ] **Step 3: 로컬 개발 서버 확인**

Run: `npm run dev` (루트에서)
Expected: 백엔드 :3000 + 프론트엔드 :4200 실행

- [ ] **Step 4: API 엔드포인트 확인**

```bash
curl http://localhost:3000/api/disclosures/today
curl http://localhost:3000/api/disclosures/types
```
Expected: JSON 응답 (데이터 없으면 빈 배열)

- [ ] **Step 5: 프론트엔드 페이지 확인**

브라우저에서:
- `http://localhost:4200/disclosure` → 대시보드 렌더링
- 헤더에 "공시 분석" 링크 존재

- [ ] **Step 6: 최종 커밋**

```bash
git add -A
git commit -m "feat(disclosure): Phase 1+2 구현 완료 — 공시 패턴 분석 서비스"
```

---

## 구현 후 수동 작업

Phase 1+2 코드 구현이 완료된 후 수동으로 진행할 작업:

1. **GitHub Secrets 설정:** `DART_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
2. **Supabase 마이그레이션 실행:** SQL 에디터에서 `001_disclosure_tables.sql` 실행
3. **백필 실행:** `cd backend && npx tsx scripts/backfill.ts` (2-3시간 소요)
4. **GitHub Actions 확인:** 워크플로우가 스케줄대로 실행되는지 확인
5. **데이터 검증:** 백필 후 패턴 통계가 합리적인지 확인
