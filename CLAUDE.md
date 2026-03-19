# CLAUDE.md

## Project Overview

Junior Chart (주린이 차트) — Stock chart analysis service for beginner investors. Analyzes correlations between current price data and historical patterns to generate prediction scenarios with confidence intervals. Angular 21 frontend + Express 5 backend, both TypeScript.

**IMPORTANT: All predictions are probabilistic suggestions based on historical patterns and do NOT reflect actual future prices. Any prediction shown to users MUST include a disclaimer: "For reference only; does not guarantee actual results."**

## Commands

```bash
# Both (backend :3000 + frontend :4200)
npm run dev
npm run build

# Backend
cd backend
npm run dev              # tsx watch with hot reload
npm run build            # tsc compilation
npm run start            # node dist/server.js
npm run test             # Jest (--experimental-vm-modules handled by script)
npm run test:watch
npm run test:coverage

# Frontend
cd frontend
npx ng serve             # Dev server :4200
npx ng build             # Production build
npx ng test              # Vitest
npx playwright test      # E2E (requires dev server running)
```

## Architecture

### Backend (`backend/`)

Express 5 server — Yahoo Finance data + pattern analysis engine. ESM throughout (`"type": "module"`, target: ESNext).

**API Endpoints:**
- `GET /api/stock/:symbol` — Basic analysis: 15d vs 5y history, Pearson+Spearman correlation, top 5 matches with confidence intervals
- `GET /api/stock/:symbol/multi-timeframe` — Short/medium/long (7/15/30d) with combined grade (A/B/C)
- `GET /api/stock/:symbol/advanced?useDTW&useATR&dtwWeight&atrPeriod` — DTW + ATR normalization
- `GET /api/stocks/quotes?symbols=AAPL,MSFT` — Real-time quotes for sidebar ticker
- `GET /api/stock/:symbol/backtest?from&to&mode&step` — Replay predictions vs actuals (max 100 points)

**Core engine** (`src/services/engine.service.ts`): Hybrid scoring (Pearson, Spearman, volume, DTW, ATR). 가격 상관계수(Pearson+Spearman 평균) >= 0.78 (DTW 사용 시 0.75)인 매치만 필터링, 거래량·DTW는 순위 결정용 복합 점수에만 반영. 상위 5개로 예측 시나리오 + 68%/95% 신뢰구간 생성.

**Data range:** `getStartDate()` dynamically calculates 5 years back from now — not a fixed date.

**Auth:** `requireAuth` (401) and `optionalAuth` middleware via Supabase JWT (HS256). All current endpoints are public.

**Environment variables** (see `backend/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `CORS_ORIGINS` | `http://localhost:4200` | Comma-separated allowed origins |
| `SUPABASE_JWT_SECRET` | — | JWT verification for auth middleware |

### Frontend (`frontend/`)

Angular 21 standalone components, lightweight-charts (candlestick), lucide-angular (icons).

**Routes:** `/` (landing), `/chart` (dashboard), `/stock-qna` (Q&A)

**Environment config:** `src/environments/environment.ts` (dev) / `environment.prod.ts` (prod) — API base URL, PostHog key, Supabase URL/anonKey.

**Prettier:** embedded in `package.json` — printWidth 100, singleQuote, Angular HTML parser.

## Deployment (Vercel)

Frontend auto-deploys on push to `main`. Strict peer dep checking — if a package was installed with `--legacy-peer-deps`, CI will fail. After adding/updating Angular packages, regenerate the lock file:

```bash
rm -rf node_modules package-lock.json && npm install
```

## Docker

Multi-stage Dockerfiles for both services. Frontend → Nginx (gzip + SPA fallback via `nginx.conf`). Backend → Node 24-alpine.

## Roadmap

See `docs/ROADMAP.md` for engine enhancement and educational value roadmap (Phase 1-4).
