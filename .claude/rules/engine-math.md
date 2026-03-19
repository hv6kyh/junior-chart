---
paths:
  - "backend/src/services/engine*"
  - "backend/tests/engine*"
---

# Engine Math Conventions

- When using weighted mean, variance MUST also be weighted: `Sum(w_i/W * (x_i - mu)^2)`
- Spearman rank ties use mid-rank method: tied values get the average of their ranks
- **Filtering vs Ranking separation**: filter on `priceScore >= threshold` (price correlation only); volume and DTW only affect `compositeScore` used for ranking
- `correlation` field = `priceScore` (avg of Pearson + Spearman). Used for frontend display, confidence grade checks, and bonus scoring
- `compositeScore` = price (70%) + volume (30%). When volume data is unavailable (`volumeScore === 0`), falls back to `priceScore` alone. Used only for sorting
- Composite weights (price + volume + DTW) must sum to 1.0. When DTW weight changes, price weight adjusts dynamically: `priceScore * (0.7 - dtwWeight)`. When volume data is unavailable, DTW weights redistribute: `priceScore * (1 - dtwWeight) + dtw * dtwWeight`
- Direction matching treats +/-0.5% change as sideways (not up/down)
- `analyzeIntegrated(history, matches)`: continuous confidence scoring 20-100 (matchCount-based base + divergence/convergence/correlation bonuses). Top correlation bonus uses `priceCorrelation`. 7 comment types (convergence/divergence/win-rate/match-count combinations)
