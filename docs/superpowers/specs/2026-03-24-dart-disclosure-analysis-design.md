# DART 공시 이벤트 기반 주가 패턴 분석 서비스 설계

## 개요

주린이 차트를 확장하여, DART 공시 발생 시 "과거 유사 공시 이후 주가가 어떻게 움직였는가"를 보여주는 서비스.

**한 줄 요약:** "오늘 나온 공시, 과거에는 이랬습니다"

**타겟 사용자:** 공시를 직접 읽지 않는 개인 투자자 (기존 주린이 차트 타겟과 동일)

**면책:** 모든 페이지에 "과거 데이터 기반 통계이며 투자 권유가 아닙니다" 문구 필수.

---

## 핵심 결정사항

| 항목 | 결정 | 근거 |
|---|---|---|
| MVP 범위 | 5가지 기능 모두 구현 | 차별점이 "공시→주가 데이터 분석"이므로 분석 없는 뉴스레터는 무의미 |
| 구현 순서 | Phase 1(데이터+엔진) → Phase 2(웹) → Phase 3(구독+뉴스레터) | Phase 2까지 가치 검증 후 배포 채널 구축 |
| 기존 서비스 통합 | 통합 (기존 서비스 내 별도 섹션) | 추후 SEC EDGAR(미국) 확장을 고려한 소스 추상화 설계 |
| 한국 주가 소스 | Yahoo Finance로 시작 | 기존 인프라 재사용, 추후 한국 전용 소스로 전환 가능 |
| 공시 유형 분류 | 대분류(10~15개)로 시작 | 표본 충분한 유형만 추후 세분화 |
| 분석 엔진 | 독립 집계 통계 엔진 | 기존 엔진의 통계 유틸만 재사용, 매칭 로직은 별도. 추후 패턴 매칭(B) 추가 가능 |
| DB | Supabase PostgreSQL | 무료 티어, 기존 프로젝트에 이미 설정됨 |
| 배치 인프라 | GitHub Actions | 무료 월 2,000분 중 ~187분 사용 예상 |
| 백필 범위 | 3년 | 최근 시장 환경 부합 + 빠른 MVP |

---

## 데이터 모델

### `disclosures` (공시)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| source | text | `'dart'` / 추후 `'edgar'` |
| source_id | text (unique) | DART 고유번호 (`rcept_no`) |
| corp_code | text | 기업코드 (DART: 8자리) |
| corp_name | text | 기업명 |
| stock_code | text | 종목코드 (예: `005930`) |
| disclosure_type | text | 대분류 코드 |
| title | text | 공시 제목 원문 |
| disclosed_at | date | 공시일 |
| source_url | text | 원문 URL |
| created_at | timestamptz | 수집 시각 |

### `disclosure_prices` (공시 기준 주가)

공시 수집 시점에는 미래 주가를 모르므로 별도 테이블로 분리. 1주/1개월/3개월 경과 후 배치에서 점진적으로 채움.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| disclosure_id | uuid (FK) | disclosures.id |
| base_price | numeric | 공시일 종가 |
| price_1w | numeric | 1주 후 종가 |
| price_1m | numeric | 1개월 후 종가 |
| price_3m | numeric | 3개월 후 종가 |
| return_1w | numeric | 1주 수익률 (%) |
| return_1m | numeric | 1개월 수익률 (%) |
| return_3m | numeric | 3개월 수익률 (%) |
| calculated_at | timestamptz | 산출 시각 |

### `pattern_stats` (집계 통계 캐시)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| disclosure_type | text | 대분류 코드 |
| period | text | `'1w'` / `'1m'` / `'3m'` |
| sample_count | integer | 표본 수 |
| avg_return | numeric | 평균 수익률 |
| median_return | numeric | 중앙값 |
| stddev | numeric | 표준편차 |
| positive_rate | numeric | 상승 비율 (0~1) |
| ci_lower_68 | numeric | 68% 신뢰구간 하한 |
| ci_upper_68 | numeric | 68% 신뢰구간 상한 |
| ci_lower_95 | numeric | 95% 신뢰구간 하한 |
| ci_upper_95 | numeric | 95% 신뢰구간 상한 |
| updated_at | timestamptz | 마지막 갱신 |

### `subscribers` (이메일 구독 — Phase 3)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | |
| email | text (unique) | |
| status | text | `'active'` / `'unsubscribed'` |
| subscribed_at | timestamptz | |
| unsubscribed_at | timestamptz | nullable |

### 공시 대분류 유형 (MVP: 13개)

| 코드 | 한국어 | 설명 |
|---|---|---|
| `treasury_stock_acquire` | 자사주 취득 | 자기주식 취득 결정 |
| `treasury_stock_dispose` | 자사주 처분 | 자기주식 처분 결정 |
| `capital_increase` | 유상증자 | 주주배정/일반공모/제3자배정 |
| `capital_decrease` | 감자 | 유상/무상 감자 |
| `convertible_bond` | CB 발행 | 전환사채 발행 결정 |
| `bond_with_warrant` | BW 발행 | 신주인수권부사채 |
| `merger` | 합병 | 흡수합병/신설합병 |
| `split` | 분할 | 인적분할/물적분할 |
| `stock_split` | 액면분할 | 주식분할 |
| `ceo_change` | 대표이사 변경 | 대표이사 선임/사임 |
| `large_shareholder` | 대량보유 변동 | 5% 이상 보유 변동 |
| `earnings_preliminary` | 실적 속보 | 매출/영업이익 잠정치 |
| `business_transfer` | 영업양수도 | 영업 양수/양도 |

---

## 백엔드 아키텍처

### 디렉토리 구조

```
backend/src/
├── services/
│   ├── engine.service.ts          # 기존 패턴 분석 엔진
│   ├── backtest.service.ts        # 기존 백테스트
│   └── disclosure/                # 공시 도메인
│       ├── types.ts               # 공통 인터페이스 정의
│       ├── providers/
│       │   └── dart.provider.ts   # DART API 래퍼
│       ├── disclosure.service.ts  # 공시 조회/분류 로직
│       ├── analysis.service.ts    # 집계 통계 엔진
│       └── batch.service.ts       # 배치 수집/통계 산출
├── routes/
│   ├── stock.routes.ts            # 기존
│   └── disclosure.routes.ts       # 공시 API
└── utils/
    └── statistics.ts              # 기존 엔진에서 추출한 공용 통계 유틸
```

### 핵심 인터페이스 (`types.ts`)

```typescript
interface DisclosureProvider {
  source: 'dart' | 'edgar';
  fetchRecent(date: string): Promise<RawDisclosure[]>;
  fetchHistorical(from: string, to: string): Promise<RawDisclosure[]>;
  classifyType(raw: RawDisclosure): DisclosureType | null;
}

interface RawDisclosure {
  sourceId: string;
  corpCode: string;
  corpName: string;
  stockCode: string;
  title: string;
  disclosedAt: string;
  sourceUrl: string;
  rawType: string;
}

type DisclosureType =
  | 'treasury_stock_acquire' | 'treasury_stock_dispose'
  | 'capital_increase' | 'capital_decrease'
  | 'convertible_bond' | 'bond_with_warrant'
  | 'merger' | 'split' | 'stock_split'
  | 'ceo_change' | 'large_shareholder'
  | 'earnings_preliminary' | 'business_transfer';
```

### API 엔드포인트

| Method | Path | 설명 |
|---|---|---|
| `GET` | `/api/disclosures/today` | 오늘의 공시 목록 + 각 유형별 간단 통계 |
| `GET` | `/api/disclosures/:id` | 공시 상세 + 해당 유형의 과거 패턴 통계 |
| `GET` | `/api/disclosures/stats/:type` | 특정 공시 유형의 전체 집계 통계 |
| `GET` | `/api/disclosures/types` | 공시 유형 목록 + 각 유형별 표본 수 |
| `POST` | `/api/subscribers` | 이메일 구독 등록 (Phase 3) |
| `GET` | `/api/subscribers/unsubscribe?token=xxx` | 구독 해지 — 서명된 토큰 검증 (Phase 3) |

### 공용 통계 유틸 추출

기존 `engine.service.ts`에서 재사용할 함수들을 `utils/statistics.ts`로 추출:

- `getTMultiplier()` — t-분포 임계값
- `calculateConfidenceInterval()` — 신뢰구간 계산
- `calculateVolatility()` — 변동성 산출
- `median()`, `stddev()` — 기본 통계

기존 엔진도 이 유틸을 import하게 리팩터링하여 코드 중복을 제거.

---

## DART Provider 상세

### 사용할 DART API 엔드포인트

| API | 용도 | 호출 빈도 |
|---|---|---|
| `공시검색` (`list.json`) | 일자별 공시 목록 조회 | 매일 1회 + 백필 시 |
| `고유번호` (`corpCode.xml`) | 기업 고유번호 → 종목코드 매핑 | 초기 1회 (XML 다운로드) |

### 공시 유형 분류 로직

DART API의 `report_nm`(공시 제목)과 `pblntf_detail_ty`(공시 상세 유형)을 조합하여 대분류에 매핑:

```
- 제목에 "자기주식" + "취득" → treasury_stock_acquire
- 제목에 "자기주식" + "처분" → treasury_stock_dispose
- 제목에 "유상증자" 또는 "주주배정" → capital_increase
- 제목에 "전환사채" → convertible_bond
- 제목에 "합병" → merger
- 제목에 "분할" (+ "액면" 없음) → split
- 제목에 "액면분할" → stock_split
- ...
- 매칭 안 됨 → null (수집하되 분류에서 제외)
```

DART 공시 제목은 "자기주식취득결정", "전환사채권발행결정" 같은 정형화된 패턴을 따르므로 키워드 매칭 정확도가 높음.

### 기업코드 ↔ 종목코드 ↔ 시장 매핑

1. 초기 셋업 시 DART `corpCode.xml` 다운로드 (전체 기업 목록, ~3MB)
2. `corp_code` → `stock_code` + `corp_cls` 매핑 구성 (상장사만 필터링, ~2,500개)
   - `corp_cls` 필드로 시장 구분: `Y` = KOSPI(유가증권), `K` = KOSDAQ
3. Supabase에 캐시하거나 메모리에 로드

### 주가 매핑 (Yahoo Finance)

```
종목코드 + corp_cls → Yahoo Finance 심볼 변환:
  005930 (corp_cls=Y) → 005930.KS (KOSPI)
  035720 (corp_cls=K) → 035720.KQ (KOSDAQ)

수익률 계산 기준:
  - 공시일 종가: base_price
  - +5 영업일 종가: price_1w (1주)
  - +21 영업일 종가: price_1m (1개월)
  - +63 영업일 종가: price_3m (3개월)
```

### 에러 핸들링

| 상황 | 대응 |
|---|---|
| DART API 일시 장애 | 3회 재시도 (exponential backoff), 실패 시 GitHub Actions 알림 |
| 종목코드 매핑 실패 (비상장사) | 공시는 저장하되 주가 분석 대상에서 제외 |
| Yahoo Finance에서 한국 종목 데이터 없음 | 해당 공시의 `disclosure_prices` 미생성, 로그 기록 |
| 분류 불가 공시 | `disclosure_type = null`로 저장, 월간 미분류 리포트 확인 |

---

## 프론트엔드 구조

### 라우팅

| 라우트 | 컴포넌트 | 설명 |
|---|---|---|
| `/` | LandingComponent | 기존 (공시 분석 소개 섹션 추가) |
| `/chart` | DashboardComponent | 기존 |
| `/stock-qna` | StockQnaComponent | 기존 |
| `/disclosure` | DisclosureDashboardComponent | 오늘의 공시 + 유형별 탐색 |
| `/disclosure/:id` | DisclosureDetailComponent | 공시 상세 + 과거 패턴 차트 |
| `/disclosure/type/:type` | DisclosureTypeStatsComponent | 유형별 전체 통계 대시보드 |

### 컴포넌트 구조

```
frontend/src/app/
├── disclosure/                        # 공시 도메인 (lazy loaded)
│   ├── disclosure.routes.ts           # 라우트 정의
│   ├── disclosure-dashboard/          # 오늘의 공시 목록
│   ├── disclosure-detail/             # 공시 상세 + 패턴 차트
│   ├── disclosure-type-stats/         # 유형별 통계 대시보드
│   ├── components/                    # 공유 하위 컴포넌트
│   │   ├── disclosure-card/           # 공시 요약 카드
│   │   ├── return-distribution/       # 수익률 분포 히스토그램
│   │   ├── period-stats-table/        # 기간별 통계 테이블
│   │   └── type-badge/               # 공시 유형 배지
│   └── services/
│       └── disclosure.service.ts      # API 클라이언트
```

### 주요 화면

**1) 공시 대시보드 (`/disclosure`)** — 오늘의 공시 목록(유형 필터 가능) + 공시 유형별 카드 탐색

**2) 공시 상세 (`/disclosure/:id`)** — 기간별 통계 테이블(1주/1개월/3개월 평균, 중앙값, 상승률, 표본수) + 수익률 분포 히스토그램 + DART 원문 링크

**3) 유형별 통계 (`/disclosure/type/:type`)** — 기간 탭 선택 + 수익률 분포 히스토그램 + 연도별 추이 + 최근 사례 목록

### 차트 라이브러리

수익률 분포 히스토그램은 lightweight-charts에 적합하지 않으므로 기본 CSS/SVG 또는 Chart.js 사용. 추후 패턴 매칭(B방식) 추가 시 기존 lightweight-charts 활용.

### 기존 컴포넌트 재사용

- `DisclaimerComponent` — 면책 문구
- `HeaderComponent` — 네비게이션에 "공시 분석" 메뉴 추가
- Design tokens — 색상/간격/타이포그래피
- `AnalyticsService` — PostHog 이벤트 트래킹

### Lazy Loading

공시 모듈은 별도 chunk로 분리하여 기존 차트 페이지 초기 로딩에 영향 없음:

```typescript
{ path: 'disclosure', loadChildren: () => import('./disclosure/disclosure.routes') }
```

---

## 배치 파이프라인

### GitHub Actions 워크플로우

```
.github/workflows/
├── disclosure-collect.yml    # 공시 수집 (매일 09:00 KST)
├── disclosure-prices.yml     # 주가 수집 + 수익률 계산 (매일 18:00 KST)
└── disclosure-stats.yml      # 패턴 통계 갱신 (매일 18:30 KST)
```

**워크플로우 1: 공시 수집** — cron `0 0 * * 1-5` (UTC 00:00 = KST 09:00, 평일). DartProvider.fetchRecent(yesterday) → classifyType() → Supabase INSERT. 예상 ~1분.

**워크플로우 2: 주가 수집** — cron `0 9 * * 1-5` (UTC 09:00 = KST 18:00, 평일). 미채워진 disclosure_prices 조회 → Yahoo Finance 종가 조회 → 수익률 계산 + UPDATE. 예상 ~3-5분.

**워크플로우 3: 통계 갱신** — cron `30 9 * * 1-5` (UTC 09:30 = KST 18:30, 평일). 유형별 집계 쿼리 → pattern_stats UPSERT. 예상 ~30초.

### 배치 스크립트

```
backend/scripts/
├── collect-disclosures.ts    # 공시 수집
├── update-prices.ts          # 주가 갱신
├── update-stats.ts           # 통계 산출
└── backfill.ts               # 3년 백필 (초기 1회)
```

스크립트는 `backend/src/services/disclosure/`의 Provider, Service 코드를 직접 import하여 로직 중복 없이 공유.

### 초기 백필 전략

1. DART `corpCode.xml` 다운로드 → corp_code ↔ stock_code 매핑 구성
2. 월 단위로 DART API 호출 (36개월 × 페이지네이션), 예상 ~30분
3. 분류 가능 공시만 disclosures에 INSERT
4. Yahoo Finance에서 주가 조회 → 수익률 계산, 예상 ~1-2시간
5. pattern_stats 전체 산출

총 예상 소요: ~2-3시간 (로컬 또는 GitHub Actions에서 수동 실행)

---

## Phase 3: 이메일 구독 & 뉴스레터

Phase 2(웹 대시보드)에서 가치 검증 후 구현.

### 이메일 서비스

MVP는 Resend (무료 월 3,000건), 구독자 증가 시 AWS SES로 전환. 발송 로직도 Provider 패턴으로 추상화.

### 구독 흐름

- 랜딩 페이지에서 이메일 입력 → `POST /api/subscribers` → Supabase INSERT + 환영 이메일
- 뉴스레터 하단 구독 해지 링크 → `GET /api/subscribers/unsubscribe?token=xxx` → status 변경

### 뉴스레터 생성

```
backend/src/services/disclosure/
└── newsletter/
    ├── template.ts          # HTML 생성 함수
    └── send.service.ts      # Resend/SES 추상화
```

GitHub Actions 추가 워크플로우: 매일 19:00 KST 발송. 오늘 공시 + 유형별 통계 요약 + 웹 링크 + 면책 문구.

---

## 환경 변수

### 기존 + 추가

```
# Phase 1-2
DART_API_KEY=                       # DART Open API 인증키
SUPABASE_URL=                       # Supabase 프로젝트 URL (기존)
SUPABASE_SERVICE_KEY=               # 배치용 Service Role Key

# Phase 3
RESEND_API_KEY=                     # Resend API 키
NEWSLETTER_FROM=                    # 발신 이메일
NEWSLETTER_UNSUBSCRIBE_SECRET=      # 해지 토큰 서명용
```

GitHub Actions Repository Secrets: `DART_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, (Phase 3: `RESEND_API_KEY`)

---

## 리소스 사용량 추정

### GitHub Actions

| 항목 | 월간 |
|---|---|
| 공시 수집 (1분 × 22일) | 22분 |
| 주가 수집 (5분 × 22일) | 110분 |
| 통계 갱신 (0.5분 × 22일) | 11분 |
| 뉴스레터 (2분 × 22일, Phase 3) | 44분 |
| **합계** | **~187분/월** (무료 2,000분의 9%) |

### Supabase 용량

| 테이블 | 예상 행 수 (3년) | 예상 용량 |
|---|---|---|
| disclosures | ~15,000건 | ~5MB |
| disclosure_prices | ~15,000건 | ~3MB |
| pattern_stats | ~39건 | <1MB |
| 인덱스 등 | | ~5MB |
| **합계** | | **~15MB** (무료 500MB의 3%) |

---

## 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| "투자 조언" 오해 | 모든 페이지에 면책 문구 필수 |
| 패턴 분석 신뢰도 | 표본 수 부족 유형은 "데이터 부족" 표시 |
| DART API 변경/장애 | 3회 재시도 + 실패 알림 |
| Yahoo Finance 한국 데이터 정확성 | 알려진 이슈 발생 시 한국 전용 소스로 전환 |
| 분류 규칙 누락 | 미분류 공시 저장 + 월간 리뷰로 규칙 추가 |

---

## 확장 계획

### 단기 (MVP 이후)

- 표본 충분한 유형의 하위 분류 자동 노출
- 시가총액/업종별 세분화 통계 (v2)

### 중기

- SEC EDGAR Provider 추가 → 미국 주식 공시 분석
- 관심 종목 공시 알림
- 공시 유형 간 복합 분석

### 장기

- 기존 엔진과 결합한 패턴 매칭 방식(B) 추가: "같은 유형 공시 + 유사한 주가 흐름"
- 공시 유형별 구독 설정
