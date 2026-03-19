---
paths:
  - "frontend/src/app/**/*.component.*"
  - "frontend/src/app/**/*.ts"
---

# Frontend Credibility Guidelines

- Never hardcode numbers in analysis views (modal, sidebar) — always bind from backend response data
- Landing page marketing copy must stay "defensible": keep claims consistent with actual data scale (5 years ~ 1,200 sliding windows)
- `predictionSize` is currently 10 days (~2 weeks) — always bind `match.future.length` dynamically when displaying prediction periods
