---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.html"
  - "frontend/src/**/*.css"
  - "frontend/src/**/*.scss"
---

# Design System Rules

All CSS tokens are defined in `frontend/src/styles.scss` on `:root`. Use `var(--token-name)` exclusively.

## 1. Color System

**NEVER hardcode hex/rgb colors.** Always use the design tokens below.

### Korean Stock Color Convention

| Direction | Token              | Hex     | Meaning        |
|-----------|--------------------|---------|----------------|
| UP / gain | `--positive-color` | #f04452 | **Red = price up** |
| DOWN / loss | `--negative-color` | #3182f6 | **Blue = price down** |

Background variants: `--positive-bg` (light red), `--negative-bg` (light blue).

> This is the **opposite** of Western convention. Red means bullish, blue means bearish.

### Surface & Text

| Token              | Usage                                |
|--------------------|--------------------------------------|
| `--bg-color`       | Page background                      |
| `--bg-elevated`    | Elevated surfaces (modals, popovers) |
| `--content-bg`     | Cards, panels                        |
| `--primary-color`  | Accent, links, CTA buttons           |
| `--primary-light`  | Primary tinted backgrounds           |
| `--primary-lighter`| Subtle primary highlights            |
| `--text-primary`   | Body text, headings                  |
| `--text-secondary` | Captions, descriptions               |
| `--text-tertiary`  | Hints, timestamps                    |
| `--text-disabled`  | Disabled state text                  |

### Semantic Colors

| Token            | Usage                    |
|------------------|--------------------------|
| `--warning-color`/`--warning-bg` | Non-critical alerts |
| `--success-color`/`--success-bg` | Positive confirmations |
| `--error-color`/`--error-bg`/`--error-border` | Validation errors |
| `--grade-a`/`--grade-b`/`--grade-c` | Analysis grade badges (A=green, B=orange, C=red) |
| `--vol-low`/`--vol-medium`/`--vol-high`/`--vol-very-high` | Volume intensity scale |
| `--border-color`  | Default borders          |
| `--border-light`  | Subtle borders/dividers  |
| `--divider-color` | Section dividers         |

## 2. Typography

**Font family:** `Pretendard` is loaded globally. Never override `font-family` in components.

### Size Scale

| Token             | Size | Usage                             |
|-------------------|------|-----------------------------------|
| `--font-size-xs`  | 11px | Badges, fine print                |
| `--font-size-sm`  | 13px | Captions, table cells, metadata   |
| `--font-size-md`  | 15px | Body text (default)               |
| `--font-size-lg`  | 18px | Section headings, card titles     |
| `--font-size-xl`  | 22px | Page subtitles                    |
| `--font-size-2xl` | 28px | Page titles                       |
| `--font-size-3xl` | 36px | Hero/landing headings             |

### Weight & Line Height

| Token                    | Value | Token                   | Value |
|--------------------------|-------|-------------------------|-------|
| `--font-weight-regular`  | 400   | `--line-height-tight`   | 1.2   |
| `--font-weight-medium`   | 500   | `--line-height-normal`  | 1.5   |
| `--font-weight-semibold` | 600   | `--line-height-relaxed` | 1.65  |
| `--font-weight-bold`     | 700   |                         |       |

Pair headings with `--line-height-tight`, body text with `--line-height-normal`, long-form with `--line-height-relaxed`.

## 3. Component Patterns

### Buttons

```scss
.btn-primary {
  background: var(--primary-color);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: var(--space-sm) var(--space-lg);
  font-weight: var(--font-weight-medium);
  transition: opacity var(--transition-fast);
  &:hover { opacity: 0.85; }
}
```

### Modals

- Overlay: `background: rgba(0, 0, 0, 0.5)`
- Content panel: `background: var(--bg-elevated)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-xl)`
- Padding: `var(--space-2xl)`

### Inputs & Forms

- Border: `1px solid var(--border-color)`, `border-radius: var(--radius-sm)`
- Focus: `border-color: var(--primary-color)`, `box-shadow: 0 0 0 3px var(--primary-light)`
- Error state: `border-color: var(--error-color)`
- Padding: `var(--space-sm) var(--space-md)`

### Cards

- Background: `var(--content-bg)`
- Border: `1px solid var(--border-color)` OR `box-shadow: var(--shadow-sm)` (pick one, not both)
- Border-radius: `var(--radius-md)`
- Padding: `var(--space-lg)` or `var(--space-2xl)`

## 4. Spacing & Layout

**8px grid.** Use spacing tokens for all `padding`, `margin`, and `gap`.

| Token          | Value | Typical usage              |
|----------------|-------|----------------------------|
| `--space-xs`   | 4px   | Icon-to-label gap          |
| `--space-sm`   | 8px   | Tight inner padding        |
| `--space-md`   | 12px  | Default inner padding      |
| `--space-lg`   | 16px  | Card padding, section gaps |
| `--space-xl`   | 20px  | Between card groups         |
| `--space-2xl`  | 24px  | Section padding            |
| `--space-3xl`  | 32px  | Page-level margins         |

### Shadows

`--shadow-xs` (subtle) through `--shadow-xl` (modals/dropdowns). Use `--shadow-sm` for cards, `--shadow-md` for dropdowns, `--shadow-xl` for modals.

### Radii

`--radius-xs` (4px) for tags/badges, `--radius-sm` (8px) for buttons/inputs, `--radius-md` (12px) for cards, `--radius-lg` (16px) for modals, `--radius-xl`/`--radius-2xl` for pill shapes.

### Breakpoints

| Token                  | Value  | Usage                     |
|------------------------|--------|---------------------------|
| `--breakpoint-mobile`  | 768px  | Stack layouts, hide sidebar |
| `--breakpoint-tablet`  | 1200px | Adjust grid columns        |

Use `@media (max-width: 768px)` and `@media (max-width: 1200px)`. Mobile-first is not required, but always use these exact values.

### Header

Fixed height: `var(--header-height)` (56px). Account for it with `padding-top` or `top` offsets.

### Transitions

`--transition-fast` (0.15s) for hover/focus, `--transition-normal` (0.25s) for expand/collapse, `--transition-slow` (0.35s) for page transitions.

### Icons

Use `lucide-angular`. Standard sizes: 16px (inline), 18px (buttons), 20px (standalone). Color inherits from parent by default.

## 5. Exceptions

- **Landing page** (`/` route): Uses its own navy/blue/cyan palette for hero sections. This is intentional and exempt from the token mandate.
- **Existing code**: Apply tokens to **new code only**. Do not refactor existing hardcoded values unless explicitly asked.
- **Third-party chart libraries** (lightweight-charts): Configure via their own API; CSS tokens do not apply inside canvas elements.
