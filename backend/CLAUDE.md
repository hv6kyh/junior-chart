# Backend CLAUDE.md

Express 5 + TypeScript backend for Junior Chart. Yahoo Finance에서 주가 데이터를 가져와 패턴 분석을 수행한다.

## Commands

```bash
npm run dev              # tsx watch with hot reload (port 3000)
npm run build            # tsc compilation
npm run start            # node dist/server.js
npm run test             # Jest (--experimental-vm-modules 자동 적용)
npm run test:watch       # Jest watch mode
npm run test:coverage    # Jest coverage report

# 특정 테스트 필터
npm test -- --testPathPatterns=backtest
```

## Environment Variables

`backend/.env` (`.env.example` 참조):

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `3000` | 서버 포트 |
| `CORS_ORIGINS` | `http://localhost:4200` | 쉼표 구분 허용 origin |
| `SUPABASE_JWT_SECRET` | — | auth 미들웨어 JWT 검증용 (없으면 인증 라우트 사용 불가) |

## API Endpoints

- `GET /api/stock/:symbol` — 기본 분석: 최근 15일 vs 5년 이력, 상위 5개 매치 + 신뢰구간
- `GET /api/stock/:symbol/multi-timeframe` — 단기(7d)/중기(15d)/장기(30d) 분석, 종합 신뢰등급(A/B/C)
- `GET /api/stock/:symbol/advanced?useDTW&useATR&dtwWeight&atrPeriod` — DTW 패턴 매칭 + ATR 변동성 정규화
- `GET /api/stocks/quotes?symbols=AAPL,MSFT` — 실시간 시세 (사이드바 티커용)
- `GET /api/stock/:symbol/backtest?from&to&mode&step` — 백테스팅. mode: basic/multiTimeframe/advanced. 최대 100 테스트 포인트

## Architecture

### Core Flow
1. 클라이언트가 종목 심볼로 API 요청
2. `getStartDate()`가 **현재 시점 기준 5년 전** 날짜를 동적 계산 → Yahoo Finance에서 일봉 데이터 fetch
3. `EngineService.analyze()`가 최근 가격 패턴과 상관관계 높은 과거 구간을 탐색
4. 매칭 결과 기반 예측 시나리오 + 68%/95% 신뢰구간 반환

### Pattern Matching Engine (`src/services/engine.service.ts`)
- Hybrid scoring: Pearson + Spearman + volume correlation + DTW + ATR
- 최근 15 거래일을 전체 과거 윈도우와 비교
- **필터링**: 가격 상관계수(Pearson+Spearman 평균) >= 0.78 (DTW 사용 시 0.75)
- **순위 결정**: 복합 점수(가격 70% + 거래량 30%, 거래량 데이터 없으면 가격만) 기준 정렬, 상위 5개로 예측 시나리오 생성
- 현재 가격 수준으로 정규화 후 표준편차 기반 신뢰구간
- `analyzeIntegrated(history, matches=[])`: matches 배열을 받아 matchCount·수렴·상관 품질 기반 연속 신뢰도 (20-100) 및 7종 코멘트 생성. 모든 분석 모드(basic/multi/advanced)에서 matches를 전달.

### Backtesting (`src/services/backtest.service.ts`)
- `EngineService`를 생성자 주입 (DTW/ATR 캐시 재사용)
- `evaluatePoint()`가 히스토리를 잘라 look-ahead bias 방지
- 메트릭 함수(`rmsePercent`, `maePercent`, `directionMatch`, `coverageRate`)는 static pure function

### Auth Middleware (`src/middleware/auth.middleware.ts`)
- Supabase JWT를 HS256으로 검증
- `requireAuth`: 인증 필수 (401), `optionalAuth`: 토큰 있으면 검증, 없어도 통과
- 현재 모든 엔드포인트는 public

## Testing

| 파일 | 내용 |
|------|------|
| `tests/backtest/metrics.test.ts` | 백테스트 메트릭 유닛 테스트 |
| `tests/backtest/backtest.service.test.ts` | 사인파 데이터 기반 통합 테스트 |
| `tests/engine.service.test.ts` | 엔진 서비스 유닛 테스트 |
| `tests/engine.math.test.ts` | 엔진 수학적 정확성 검증 (Pearson/Spearman/가중분산/신뢰구간/정규화) |
| `tests/engine.integrated.test.ts` | 엔진 통합 테스트 |
| `tests/engine-roadmap.test.ts` | 로드맵 기능 검증 테스트 |
| `tests/statistics.test.ts` | 통계 함수 테스트 |
| `tests/integration/api.test.ts` | API 엔드포인트 통합 테스트 |

## Test Conventions

- 수학 함수 테스트는 알려진 입출력(textbook values)으로 정확성 검증 — `toBeCloseTo(expected, 3)` 사용. 범위 검증(`toBeBetween`)만으로는 부족
- EngineService private 메서드 테스트: `(engine as any).methodName()` 패턴 사용
- `tests/integration/api.test.ts`는 서버 실행 필요 — CI가 아닌 로컬에서 서버 띄운 후 실행

## Notes
- ESM 모듈 (`"type": "module"`) 전용
- TypeScript target: ESNext
- Jest 30: `--testPathPatterns` 사용 (`--testPathPattern`은 제거됨)
