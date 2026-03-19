---
paths:
  - "frontend/src/app/app.routes.ts"
  - "frontend/src/index.html"
  - "frontend/public/sitemap.xml"
  - "frontend/public/robots.txt"
---

# SEO Checklist

Production URL: `https://junior-chart.vercel.app` (KR: "주린이 차트", EN: "Junior Chart")

When adding a new route:
1. Add SEO `data` (`title`, `description`, `keywords`) in `app.routes.ts`
2. Add the URL to `public/sitemap.xml`
3. `SeoService` will auto-update meta tags from route `data`

Existing setup:
- `index.html`: static meta tags (OG, Twitter Card), Google/Naver verification, canonical URL
- `LandingComponent`: JSON-LD structured data (WebApplication + FAQPage schema)
