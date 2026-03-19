---
paths:
  - "frontend/src/app/**/*.ts"
---

# PostHog Analytics Conventions

- `AnalyticsService` (`src/app/services/analytics.service.ts`) is the sole entry point. Initialized in `app.ts`.
- Autocapture handles clicks, pageviews, sessions, device info automatically — no manual code needed.
- To add a custom event: inject `AnalyticsService` and call `this.analytics.capture('event_name', { ... })`
- Event names: `snake_case` (e.g. `stock_selected`, `analysis_loaded`)
- Property keys: `snake_case` (e.g. `{ symbol, match_count }`)
- In dev, PostHog initialization is skipped when `apiKey` is empty string.
