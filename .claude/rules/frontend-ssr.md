---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.component.*"
---

# SSR & Platform Guards

Angular SSR is configured in `app.routes.server.ts`:
- `/` and `/stock-qna`: `RenderMode.Prerender` (static HTML at build time)
- `/chart`: `RenderMode.Client` (lightweight-charts Canvas API cannot run on server)

Any component or service using browser-only APIs (`document`, `window`, `IntersectionObserver`, `ResizeObserver`, PostHog, Supabase localStorage) MUST include an `isPlatformBrowser(this.platformId)` guard.
