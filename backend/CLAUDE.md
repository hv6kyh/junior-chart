# Backend CLAUDE.md

Express 5 + TypeScript backend for Junior Chart. See parent `CLAUDE.md` for project overview, API endpoints, environment variables, and shared commands.

## Commands (backend-specific)

```bash
# Filter specific tests
npm test -- --testPathPatterns=backtest
```

All other commands (`npm run dev/build/test/start`) are documented in the parent `CLAUDE.md`.

## Architecture

### Core Flow

1. Client requests analysis by stock symbol
2. `getStartDate()` dynamically calculates 5 years back from now → fetches daily candle data from Yahoo Finance
3. `EngineService.analyze()` finds historical segments most correlated with recent price pattern
4. Returns prediction scenarios + 68%/95% confidence intervals from matched results

Engine math conventions (filtering thresholds, scoring weights, `analyzeIntegrated` logic) are in `.claude/rules/engine-math.md` at the project root.

### Backtesting (`src/services/backtest.service.ts`)

- `EngineService` injected via constructor (reuses DTW/ATR caches)
- `evaluatePoint()` slices history to prevent look-ahead bias
- Metric functions (`rmsePercent`, `maePercent`, `directionMatch`, `coverageRate`) are static pure functions

## Gotchas

- ESM only (`"type": "module"`) — no CommonJS `require()`
- TypeScript target: ESNext
- Jest 30 uses `--testPathPatterns` (plural) — the old `--testPathPattern` flag was removed
