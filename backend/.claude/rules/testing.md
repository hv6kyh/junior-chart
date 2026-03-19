---
paths:
  - "backend/tests/**"
  - "backend/src/**/*.test.*"
---

# Backend Testing Conventions

## Math function tests
- Verify against known input/output (textbook values) with `toBeCloseTo(expected, 3)`
- Range checks (`toBeBetween`) alone are insufficient — always assert exact expected values

## Accessing private methods
- Use `(engine as any).methodName()` pattern for EngineService private method tests

## Integration tests
- `tests/integration/api.test.ts` requires a running server — run locally, not in CI
- Start the backend (`npm run dev`) before running integration tests

## Test file map

| File | Scope |
|------|-------|
| `tests/engine.service.test.ts` | Engine service unit tests |
| `tests/engine.math.test.ts` | Math accuracy (Pearson/Spearman/weighted variance/CI/normalization) |
| `tests/engine.integrated.test.ts` | Engine integration tests |
| `tests/engine-roadmap.test.ts` | Roadmap feature verification |
| `tests/statistics.test.ts` | Statistics utility functions |
| `tests/backtest/metrics.test.ts` | Backtest metric unit tests |
| `tests/backtest/backtest.service.test.ts` | Sine-wave data integration tests |
| `tests/integration/api.test.ts` | API endpoint integration (needs running server) |
