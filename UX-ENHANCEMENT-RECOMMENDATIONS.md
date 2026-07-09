# UX/UI Enhancement Recommendations — Kraken Trading Simulator

> **Product:** Kraken-style Spot & Margin Trading Simulator  
> **Platform:** Web (Next.js 16, React 19, Tailwind CSS v4, shadcn/ui)  
> **Target:** Reduce task completion time by ≥20% · Increase adoption of underutilized features · Meet WCAG 2.1 AA

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Methodology & Key Findings](#2-methodology--key-findings)
3. [Prioritized Recommendations](#3-prioritized-recommendations)
   - [P0 — Critical (Ship within 1-2 sprints)](#p0--critical-ship-within-1-2-sprints)
   - [P1 — High (Ship within 2-4 sprints)](#p1--high-ship-within-2-4-sprints)
   - [P2 — Medium (Ship within 4-6 sprints)](#p2--medium-ship-within-4-6-sprints)
   - [P3 — Low (Ongoing polish)](#p3--low-ongoing-polish)
4. [Page-by-Page Audit](#4-page-by-page-audit)
5. [Accessibility Compliance Checklist](#5-accessibility-compliance-checklist)
6. [Measurement Plan](#6-measurement-plan)

---

## 1. Executive Summary

The Kraken Trading Simulator is a feature-rich educational platform with robust backend logic, 10+ page views, real-time price streaming, and support for 12+ order types. However, the current UI exhibits several friction points that hinder both new and returning users:

- **Dense information architecture** — Tables with 8–12 columns, 9px–11px typography, minimal whitespace
- **Inconsistent visual hierarchy** — Varied card styles, mixed languages (English + Hungarian), non-uniform button styles
- **Buried high-priority features** — Risk management panel, stop-loss/take-profit settings, and journal entry are hidden in collapsible sections or tabs
- **Weak interactive cues** — Subtle hover states, no persistent focus indicators, color-only status indicators
- **Inconsistent loading patterns** — Some pages use skeletons, others use spinners, some show empty states without loading indicators
- **Accessibility gaps** — No ARIA labels on interactive elements, no `aria-live` regions for real-time updates, keyboard navigation gaps

**The following 20 recommendations are designed to address these pain points, drive a ≥20% reduction in task completion time, and increase adoption of underutilized features like risk management, journaling, and advanced order types.**

---

## 2. Methodology & Key Findings

### Analysis Method

- **Code review:** Examined all page components, shared UI components, layout files, and store integrations
- **Visual audit:** Analyzed classNames, layout structure, typography scale, color tokens, and interactive states
- **Accessibility scan:** Mapped WCAG 2.1 AA criteria against existing patterns
- **Heuristic evaluation:** Applied Nielsen's 10 usability heuristics and Material Design guidelines

### Critical Pain Points Identified

| Pain Point                                                 | Severity | Affected Pages                                   | Impact                                               |
| ---------------------------------------------------------- | -------- | ------------------------------------------------ | ---------------------------------------------------- |
| Inconsistent visual hierarchy (tiny labels + dense tables) | High     | Dashboard, Portfolio, Orders, Positions, History | Users scan but cannot find key data quickly          |
| Mixed language labels (Hungarian + English)                | Medium   | Dashboard                                        | Confuses English-primary users                       |
| Risk Management panel hidden by default                    | High     | Trade                                            | Low adoption of stop-loss/take-profit tools          |
| No skeleton loading states                                 | Medium   | All pages                                        | Perceived slowness, user drop-off                    |
| Color-only status indicators                               | High     | Positions, Orders, Dashboard                     | Excludes color-blind users, no screen reader context |
| No keyboard focus indicators                               | High     | All pages                                        | Blocks keyboard-only users                           |
| Collapsible filter panels require extra click              | Medium   | Orders, History                                  | Adds friction to task completion                     |
| Journal feature buried in bottom-panel tab                 | Medium   | Trade                                            | Low journal adoption despite implementation          |
| Inconsistent button/toggle component usage                 | Low      | Settings, Trade                                  | Perceived lack of polish                             |
| No guided onboarding for first-time users                  | High     | All                                              | Higher bounce rate for new users                     |

---

## 3. Prioritized Recommendations

---

### P0 — Critical (Ship within 1-2 sprints)

These recommendations address foundational usability, accessibility barriers, and the highest-impact friction points. Implementing them alone will deliver the largest measurable improvement.

---

#### R1. Implement Persistent, High-Contrast Focus Indicators✅

**Rationale:** The application currently relies on Tailwind's default `outline-ring/50` for focus states, which provides insufficient visibility — especially on dark mode. WCAG 2.1 SC 2.4.7 requires a **visible focus indicator** on all keyboard-focusable elements. Without this, keyboard-only and power users cannot navigate efficiently, directly increasing task completion time.

**Implementation:**

- Add a custom `focus-visible` ring with 3:1 minimum contrast against all backgrounds
- Apply consistently across all interactive elements: `<button>`, `<a>`, `<input>`, `<select>`, `<textarea>`, and custom interactive components (toggles, sliders, table rows)
- Extend the Tailwind theme with `--focus-ring` and `--focus-ring-offset` tokens

```css
/* In globals.css */
@layer base {
  * {
    @apply focus-visible:outline-2 focus-visible:outline-offset-2;
    @apply focus-visible:outline-[var(--focus-ring)];
  }
}

/* Update :root and .dark with distinct focus ring colors */
:root {
  --focus-ring: oklch(0.45 0.15 265); /* accessible blue */
}
.dark {
  --focus-ring: oklch(0.65 0.18 265); /* lighter blue against dark bg */
}
```

**Priority:** P0 — Critical  
**Effort:** 2–3 days (CSS tokens + auditing all interactive elements)  
**Impact:** ✅ Accessibility (WCAG 2.4.7) ✅ Keyboard navigation speed ✅ Power user satisfaction  
**Target metric:** 100% of interactive elements pass focus-indicator audit

---

#### R2. Add ARIA Live Regions for Real-Time Price Updates✅

**Rationale:** The SSE price stream pushes updates every 1–3 seconds. Currently, screen readers receive no notification of these changes. WCAG 2.1 SC 4.1.3 (Status Messages) requires dynamic content updates to be programmatically announced. Additionally, the `WorkerTick` component polls `/api/worker/tick` every 1.5s — order status changes go unannounced.

**Implementation:**

- Wrap the TickerTape price display with `aria-live="polite"` + `aria-atomic="true"`
- Add `role="status"` to order confirmation toast toasts and the `Toast` sonner component
- For the Trade page's Order Book, add `aria-live="polite"` announcements when the spread or top-of-book changes
- Add `aria-busy="false"` on data containers after loading completes

```jsx
<div
  aria-live="polite"
  aria-atomic="true"
  className="ticker-tape"
>
  {prices.map(...)}
</div>
```

**Priority:** P0 — Critical  
**Effort:** 1–2 days  
**Impact:** ✅ Accessibility (WCAG 4.1.3) ✅ Screen reader usability ✅ Compliance  
**Target metric:** 100% of real-time data regions have `aria-live` attributes

---

#### R3. Unify Language & Terminology Across All Pages✅

**Rationale:** The Dashboard page contains mixed Hungarian/English text — e.g., "Teljes portfólió (Total Equity)", "Nincsenek nyitott pozíciók", "Margin Call közel". This creates confusion for English-primary users and undermines professional credibility. The settings page offers 6 languages, so the default should be consistent English.

**Implementation:**

- Replace all Hungarian label strings in `app/(main)/dashboard/page.tsx`, `EquityHeroCard.tsx`, and any other components with English equivalents
- Create a centralized label/string mapping for future i18n
- Set default language to English in settings

| Current (Hungarian)                            | Replacement (English)                      |
| ---------------------------------------------- | ------------------------------------------ |
| "Teljes portfólió (Total Equity)"              | "Total Equity"                             |
| "Nincsenek nyitott pozíciók"                   | "No open positions"                        |
| "Menj a Trade oldalra egy pozíció nyitásához." | "Go to the Trade page to open a position." |
| "Még nincsenek kötések"                        | "No trades yet"                            |
| "Az első kereskedésed után itt jelennek meg."  | "They will appear after your first trade." |
| "Egészséges margin szint."                     | "Healthy margin level."                    |
| "Nincs nyitott margin pozíció."                | "No open margin positions."                |

**Priority:** P0 — Critical  
**Effort:** 0.5 day (search & replace, then spot-check)  
**Impact:** ✅ Brand consistency ✅ International user trust ✅ Reduced cognitive load  
**Target metric:** 0 non-English UI strings in default locale

---

#### R4. Add Skeleton Loading Screens on All Data Pages✅

**Rationale:** Currently, the app shows a single `<RootLoading>` component (spinner) for all pages. Data pages (Dashboard, Portfolio, Orders, Positions, History) make server-side data calls that can take 500ms–2s. Users see a blank page or spinner, increasing perceived latency. Skeleton screens reduce perceived wait time by up to **40%** (Nielsen Norman Group).

**Implementation:**

- Create a shared `Skeleton` ui component if not already present (check `components/ui/skeleton.tsx`)
- For each page, create a dedicated loading skeleton matching the page layout structure:

```tsx
// app/(main)/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className='p-4 md:p-6 space-y-4 md:space-y-6'>
      {/* Header skeleton */}
      <div className='flex justify-between'>
        <Skeleton className='h-6 w-32' />
        <Skeleton className='h-4 w-16' />
      </div>
      {/* Hero card skeleton */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
        <div className='lg:col-span-2'>
          <Skeleton className='h-32 w-full rounded-xl' />
        </div>
        <Skeleton className='h-32 w-full rounded-xl' />
      </div>
      {/* More skeletons matching the page layout */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Skeleton className='h-28 w-full rounded-xl' />
        <Skeleton className='h-28 w-full rounded-xl' />
      </div>
    </div>
  );
}
```

**Pages requiring custom skeletons:**

- `app/(main)/dashboard/loading.tsx` — Update existing
- `app/(main)/portfolio/loading.tsx` — Update existing (cards + chart + tables)
- `app/(main)/orders/loading.tsx` — Update existing (tabs + table)
- `app/(main)/positions/loading.tsx` — Update existing (summary cards + table)
- `app/(main)/history/loading.tsx` — Update existing (tabs + filters + table)
- `app/(main)/settings/loading.tsx` — Update existing (card stack)
- `app/(main)/education/loading.tsx` — Create if missing (card grid)

**Priority:** P0 — Critical  
**Effort:** 2–3 days  
**Impact:** ✅ Perceived performance ✅ User retention ✅ Professional polish  
**Target metric:** Perceived load time reduced from ~2s to <500ms (First Meaningful Paint)

---

### P1 — High (Ship within 2-4 sprints)

---

#### R5. Expose Risk Management Panel by Default on Trade Page✅

**Rationale:** The `RiskManagementPanel` component in `OrderEntry.tsx` is collapsed by default. Risk management (stop-loss/take-profit/position sizing) is a **core educational feature** of this simulator. Hiding it behind a collapsible section means most users never see or use it, defeating the educational purpose. This directly causes low adoption of position-sizing and risk-calculation tools.

**Implementation:**

- In `OrderEntry.tsx`, change the Risk Management Panel to be **expanded by default** when:
  - The user selects a `MARGIN` market type (toggle to expanded)
  - The user selects a conditional order type (`STOP_LOSS`, `TAKE_PROFIT`, etc.)
- Add a collapsible toggle to minimize it for advanced users who don't need it
- Move the Risk Management Panel **above** the Submit button for visual prominence

```tsx
// In OrderEntry.tsx — change from:
<RiskManagementPanel ... />
// To:
<RiskManagementPanel expanded={marketType === 'MARGIN' || ['STOP_LOSS', 'TAKE_PROFIT', ...].includes(orderType)} />
```

**Priority:** P1 — High  
**Effort:** 0.5 day  
**Impact:** ✅ Risk management adoption ✅ Educational goal achievement ✅ New user guidance  
**Target metric:** Risk panel interaction rate increases from <10% to >50% of margin trades

---

#### R6. Add Color-Blind Safe Indicators (Patterns + Icons + Labels)✅

**Rationale:** Currently, the app uses **color alone** to convey meaning throughout:

- `text-positive` (green) / `text-negative` (red) for P&L, price changes, and side indicators
- Colored dots (`bg-positive`/`bg-negative`/`bg-amber-500`) for liquidation risk
- Colored borders for side badges
- WCAG 2.1 SC 1.4.1 requires that color is **not the only** visual means of conveying information

**Implementation:**

- **P&L values:** Add a `▲` / `▼` arrow character before signed values, or use `↑`/`↓` icons
- **Side badges (BUY/SELL, LONG/SHORT):** Already have text labels, but ensure the colored border is supplemented with a subtle fill pattern or icon prefix (e.g., `+` for LONG, `−` for SHORT)
- **Liquidation risk dots:** Replace with a label + icon: `🟢 Safe` / `🟡 Warning` / `🔴 Danger` — or use SVG pattern fills
- **Buy/Sell buttons:** Already have text ("Buy" / "Sell"), but the active state uses only background color — add a checkmark or underline indicator

```tsx
// Example: PnL with icon prefix
function PnLDisplay({ value }: { value: number }) {
  return (
    <span className={cn(value >= 0 ? 'text-positive' : 'text-negative')}>
      {value >= 0 ? '▲ ' : '▼ '}
      {formatUsd(value, { signed: true })}
    </span>
  );
}
```

**Priority:** P1 — High  
**Effort:** 2–3 days (component by component)  
**Impact:** ✅ Accessibility (WCAG 1.4.1) ✅ Color-blind users (4.5% of population) ✅ Clarity  
**Target metric:** 0 instances of color-only information conveyance

---

#### R7. Build a Context-Aware, Expandable First-Run Onboarding Tour✅

**Rationale:** New users land on the Dashboard with no guidance. The Education page exists but is not surfaced contextually. There is no progressive onboarding. First-run users have a high cognitive load trying to understand the interface. A guided tour can reduce task completion time by **30–50%** for new users (see: Pendo/Appcues benchmarks).

**Implementation:**

- Create a lightweight tour component using a step-by-step overlay (no external dependency — build with shadcn/ui `Popover` and `Dialog`)
- Trigger the tour on first visit (check `localStorage` or session flag)
- Tour steps:

  1. **Dashboard** — "This is your portfolio overview. Your starting capital was $10,000."
  2. **Trade** — "This is where you execute trades. Switch between Spot and Margin trading."
  3. **Order Entry** — "Select an order type. Start with a Market order to buy instantly."
  4. **Risk Management** — "Always set a Stop Loss to protect your capital."
  5. **Bottom Panel** — "Monitor your open orders, positions, and trade history here."
  6. **Education** — "Learn about all order types and complete the interactive tutorial."

- Add a "Show me around again" button in the Settings page or a floating help icon
- Track completion rate as a product metric

**Priority:** P1 — High  
**Effort:** 3–4 days  
**Impact:** ✅ New user retention ✅ Task completion speed ✅ Feature discovery  
**Target metric:** 60%+ tour completion rate; 30% reduction in first-trade time

---

#### R8. Refactor Navigation: Add Quick-Action Bar for Core Tasks✅

**Rationale:** The sidebar has 10 navigation items. Users perform mostly 3–4 core tasks: **Trade** → **Dashboard** → **Portfolio** → **Orders**. Other pages (Backtest, Journal, Education) are secondary. The navigation has no quick-action buttons for frequent tasks like "New Order" or "Close All Positions".

**Implementation:**

- Add a **floating quick-action bar** (or a secondary bottom nav on mobile) with:
  - "Quick Buy/ Sell" shortcut (opens Trade page with pre-selected Market order)
  - "Close All Positions" action (with confirmation dialog)
  - "New Journal Entry" quick button
- On desktop, add keyboard shortcuts panel to the TopBar (Cmd+K palette for power users)
- Reorder sidebar items by frequency:
  1. Dashboard
  2. Trade (⭐ most frequent)
  3. Portfolio
  4. Positions
  5. Orders
  6. History
  7. Education
  8. Journal
  9. Backtest
  10. Settings
- Consider grouping: **Trading** (Trade, Orders, Positions) | **Analytics** (Dashboard, Portfolio, History) | **Learning** (Education, Journal) | **Admin** (Settings, Backtest)

```tsx
// Quick action bar component
function QuickActions() {
  return (
    <div className='fixed bottom-4 right-4 flex flex-col gap-2 z-50'>
      <Tooltip content='Quick Buy (Ctrl+B)'>
        <Button
          onClick={quickBuy}
          className='bg-positive text-white rounded-full h-12 w-12 shadow-lg'
        >
          <Zap className='h-5 w-5' />
        </Button>
      </Tooltip>
    </div>
  );
}
```

**Priority:** P1 — High  
**Effort:** 3–5 days  
**Impact:** ✅ Navigation efficiency ✅ Power user satisfaction ✅ Feature discoverability  
**Target metric:** Task completion time reduced by ≥20% for frequent workflows

---

#### R9. Add Empty State CTAs with Direct Navigation Links✅

**Rationale:** Several empty states exist but provide only descriptive text without actionable next steps. Examples:

- Dashboard positions: "No open positions — Go to the Trade page to open a position."
- Portfolio holdings: "No crypto holdings — Buy crypto on the Trade page"
- History: "No trades found — Execute a trade..."

The current empty states are passive. Adding direct **actionable links** can increase conversion from "browsing" to "trading."

**Implementation:**

- Convert all empty state descriptive text into actionable CTAs with `<Link>` components:

```tsx
// Current (passive):
<p className="text-sm text-muted-foreground">No open positions</p>
<p className="mt-1 text-xs text-muted-foreground">Go to the Trade page to open a position.</p>

// Recommended (active):
<div className="flex flex-col items-center justify-center py-10">
  <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
  <p className="text-sm text-muted-foreground mb-3">No open positions</p>
  <Button asChild variant="outline" size="sm">
    <Link href="/trade">
      <CandlestickChart className="h-3.5 w-3.5 mr-1.5" />
      Open a Trade
    </Link>
  </Button>
</div>
```

**Affected locations:**

- `DashboardPage` — positions empty state, trades empty state
- `PortfolioPage` — holdings empty state, margin positions empty state
- `OrdersPageClient` — open orders empty state, history empty state
- `PositionsPageClient` — positions empty state
- `HistoryPageClient` — trades empty state, transactions empty state
- `BottomPanel` — OrdersTable, PositionsTable, TradesTable, JournalTab
- `Watchlist` — no matching pairs state
- `OrderEntry` — position selector empty state

**Priority:** P1 — High  
**Effort:** 1–2 days  
**Impact:** ✅ Conversion (browsing → trading) ✅ User guidance ✅ Reduced bounce  
**Target metric:** 25%+ click-through rate on empty-state CTAs

---

#### R10. Standardize Typography Scale & Whitespace✅

**Rationale:** The application uses a sprawling typography scale: 9px, 10px, 11px, 12px, 14px, 16px, 18px, 24px, 36px across different contexts. The smallest sizes (9px–10px) are used for labels, timestamps, and secondary data. At these sizes, text fails WCAG 2.1 SC 1.4.3 (4.5:1 contrast for small text) and is nearly illegible on mobile devices. Additionally, some card headers use 11px uppercase tracking-wider while others use 14px.

**Implementation:**

- Define a **strict typography scale** in `tailwind.config` (or CSS custom properties):

| Token        | Size             | Weight  | Usage                                    |
| ------------ | ---------------- | ------- | ---------------------------------------- |
| `text-micro` | 10px / 0.625rem  | 400–500 | Legal text, timestamps (minimum allowed) |
| `text-xs`    | 11px / 0.6875rem | 500     | Table data, labels, secondary metrics    |
| `text-sm`    | 12px / 0.75rem   | 500     | Body text, card descriptions             |
| `text-base`  | 14px / 0.875rem  | 500     | Default UI text, nav items               |
| `text-lg`    | 16px / 1rem      | 600     | Section headings                         |
| `text-xl`    | 18px / 1.125rem  | 600     | Card titles                              |
| `text-2xl`   | 24px / 1.5rem    | 600     | Page headings                            |
| `text-3xl`   | 30px / 1.875rem  | 700     | Hero values                              |
| `text-4xl`   | 36px / 2.25rem   | 700     | Equity hero                              |

- Increase the minimum text size to **11px** (up from 9px/10px)
- Add consistent `leading-relaxed` for paragraph text and `leading-snug` for headings
- Standardize card header patterns: all cards should use the same `text-[11px] uppercase tracking-wider text-muted-foreground` pattern — audit for outliers

**Priority:** P1 — High  
**Effort:** 1–2 days (search & replace, token audit)  
**Impact:** ✅ Readability ✅ Accessibility (WCAG 1.4.3) ✅ Visual consistency  
**Target metric:** 100% of text meets minimum 11px size and 4.5:1 contrast

---

### P2 — Medium (Ship within 4-6 sprints)

---

#### R11. Move the Journal Feature to a Dedicated Page with CTA Integration✅

**Rationale:** The journal feature is implemented and fully functional (inline editor in BottomPanel, API endpoints, CRUD operations) but is buried as one of 5 bottom-panel tabs. Users rarely discover it. Journaling after trades is a core educational behavior, and the Journal page (`/journal`) already exists as a dedicated route. The bottom-panel inline editor is a good quick-entry point, but the main journaling experience should be elevated.

**Implementation:**

- Add a "Journal this trade" quick action button after each trade execution (in the order success feedback/toast)
- Promote the `/journal` page in the sidebar navigation (already exists)
- Add a "Recent journal entries" widget on the Dashboard that links to the full journal
- Keep the bottom-panel inline editor but add a "Open full journal" link at the bottom

```tsx
// In BottomPanel JournalTab footer:
<Link
  href='/journal'
  className='flex items-center justify-center gap-1.5 border-t border-border py-2 text-[10px] text-accent hover:underline'
>
  <BookOpen className='h-3 w-3' />
  Open full Trading Journal
</Link>
```

**Priority:** P2 — Medium  
**Effort:** 2–3 days  
**Impact:** ✅ Journal adoption ✅ Educational value ✅ Feature discoverability  
**Target metric:** Journal entry rate increases from <5% to >20% of trades

---

#### R12. Build Responsive Column Choosers for Data Tables✅

**Rationale:** Several pages (Orders, Positions, History, Portfolio) display dense tables with 8–12 columns. On tablets and mobile, horizontal scrolling makes comparison tasks difficult. On desktop, some columns may be unnecessary for most users. A configurable column chooser reduces cognitive overload.

**Implementation:**

- Add a gear icon button next to each table header that opens a dropdown of toggleable column visibility
- Persist column preferences in `localStorage` per user
- Set smart **defaults** based on viewport:
  - Desktop: Show all columns
  - Tablet (<1024px): Hide "Fee", "Market", and "Trigger" columns by default; show only essential columns
  - Mobile (<768px): Show only 4–5 critical columns (Time, Pair, Side, Price, PnL)

```tsx
// Column configuration pattern
function PositionTable() {
  const [columns, setColumns] = useState(() => getDefaultColumns());
  // ...
  return (
    <div>
      <ColumnChooser
        columns={COLUMN_DEFS}
        visible={columns}
        onChange={setColumns}
      />
      <table>
        {COLUMN_DEFS.filter(c => columns.includes(c.key)).map(col => (
          <th key={col.key}>{col.label}</th>
        ))}
        {/* ... */}
      </table>
    </div>
  );
}
```

**Priority:** P2 — Medium  
**Effort:** 3–4 days  
**Impact:** ✅ Mobile usability ✅ Task efficiency ✅ User control  
**Target metric:** 30%+ of users customize columns within first week

---

#### R13. Add Progressively Enhanced Chart Interactions✅

**Rationale:** The TradingView Lightweight Charts chart is well-implemented currently but lacks:

- **Crosshair price labels** on hover (already partially supported by library)
- **Horizontal zoom** via touch gestures on mobile
- **Comparison mode** — overlay another asset's price for spread analysis
- **Chart type toggle** — switch between candlestick and line/area chart

These features differentiate an educational simulator from a simple price viewer.

**Implementation:**

- Enable `crosshairMarker` and `crosshair` label options already available in the library
- Add a chart type toggle dropdown (Candlestick / Line / Area)
- Add a "Compare with" dropdown to overlay a second asset's price line
- Enable touch-based horizontal zoom for the simplified mobile chart

```tsx
// Chart type toggle
const CHART_TYPES = [
  { id: 'candlestick', label: '📊 Candles' },
  { id: 'line', label: '📈 Line' },
  { id: 'area', label: '📉 Area' },
];

// In TradingChart.tsx:
const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>(
  'candlestick',
);
```

**Priority:** P2 — Medium  
**Effort:** 3–5 days  
**Impact:** ✅ Chart interactivity ✅ Technical analysis capability ✅ User engagement  
**Target metric:** 40%+ of users interact with chart (zoom/pan/type switch) per session

---

#### R14. Add Keyboard Shortcuts Panel & Discoverability

**Rationale:** The Order Entry component already implements `useKeyboardShortcuts` with `Ctrl+B` (Buy), `Ctrl+S` (Sell), and `Ctrl+Enter` (Submit). However, these shortcuts are **undiscoverable** — the only reference is a small keyboard icon button. Power users may never know these exist.

**Implementation:**

- Add a persistent "Keyboard shortcuts" toggle in the TopBar or as a floating badge
- Show shortcut hints inline next to buttons (e.g., "(Ctrl+B)" next to Buy button)
- Create a `KeyboardShortcutsHelp` modal (already exists as a component) — trigger it on first visit
- Add more shortcuts:
  - `1`–`5`: Switch leverage (2x–5x)
  - `Ctrl+Enter`: Submit order
  - `Esc`: Close modals, clear selection
  - `Ctrl+K`: Command palette (search assets, navigate pages)
  - `↑`/`↓`: Adjust quantity by preset increments

```tsx
// Inline shortcut hint
<Button>
  Buy <Kbd className='ml-1'>Ctrl+B</Kbd>
</Button>
```

**Priority:** P2 — Medium  
**Effort:** 3–4 days  
**Impact:** ✅ Power user efficiency ✅ Task completion speed ✅ Keyboard accessibility  
**Target metric:** 20%+ of order submissions via keyboard shortcuts

---

#### R15. Implement Smart Defaults & Context Persistence

**Rationale:** The Trade page resets order type to MARKET and quantity to empty each time the user navigates away. Similarly, the selected interval resets to 1h. Users who trade the same pair with the same settings repeatedly have to re-configure every time.

**Implementation:**

- Persist trade panel state in `localStorage`:
  - Last used order type and side per asset
  - Last used leverage and market type
  - Chart interval per asset (already partially stored in Zustand, but not persisted across sessions)
- Add a "Sticky" toggle per setting (e.g., "Remember my settings")
- On the Orders page, persist filter selections in URL search params so they survive page refreshes
- On History, persist active tab and filter state in URL params

```tsx
// Persist trade settings
const STORAGE_KEY = 'trade_settings_v1';

function loadTradeSettings(): Partial<TradeSettings> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveTradeSettings(settings: Partial<TradeSettings>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
```

**Priority:** P2 — Medium  
**Effort:** 2–3 days  
**Impact:** ✅ Task efficiency ✅ User satisfaction ✅ Session continuity  
**Target metric:** 25% reduction in repeated configuration time

---

### P3 — Low (Ongoing polish)

---

#### R16. Add Micro-Interactions & Transitions

**Rationale:** The app currently has minimal animations — only a `animate-ping` on the live indicator and `rotate-180` on chevrons. Purposeful micro-interactions improve perceived performance and delight users.

**Implementation:**

- Add `framer-motion` page transitions (already in stack):
  ```tsx
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
  ```
- Add subtle hover scale transform on cards (`hover:scale-[1.02]`)
- Add smooth number transitions for P&L values (count-up animation on change)
- Add `spring` animation for toggle switches instead of instant snap
- Add shimmer loading effect on skeleton components

**Priority:** P3 — Low  
**Effort:** 3–4 days  
**Impact:** ✅ Perceived performance ✅ User delight ✅ Professional polish  
**Target metric:** User satisfaction NPS increases by 5+ points

---

#### R17. Create a Unified Command Palette (⌘K)

**Rationale:** The app has 10+ pages, 5+ trading pairs, and many actions. A ⌘K command palette enables power users to navigate and act without using the mouse.

**Implementation:**

- Use the existing `Command` component from shadcn/ui (`components/ui/command.tsx`)
- Register commands:
  - **Navigation:** "Go to Trade", "Go to Dashboard", etc.
  - **Actions:** "Buy BTC", "Sell ETH", "Close all positions", "Reset simulation"
  - **Settings:** "Toggle dark mode", "Switch to live feed"
- Trigger with `Ctrl+K` / `Cmd+K`

```tsx
function CommandPalette() {
  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder='Type a command or search...' />
      <CommandList>
        <CommandGroup heading='Navigation'>
          <CommandItem onSelect={() => router.push('/trade')}>
            Go to Trade
          </CommandItem>
          <CommandItem onSelect={() => router.push('/dashboard')}>
            Go to Dashboard
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading='Actions'>
          <CommandItem onSelect={quickBuyBTC}>Buy BTC (Market)</CommandItem>
          <CommandItem onSelect={closeAllPositions}>
            Close All Positions
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
```

**Priority:** P3 — Low  
**Effort:** 2–3 days  
**Impact:** ✅ Power user efficiency ✅ Navigation speed ✅ Feature discoverability  
**Target metric:** 15%+ of navigations use command palette

---

#### R18. Add Progressively Enhanced Data Export

**Rationale:** The History, Portfolio, and Orders pages display data that users may want to analyze externally. Adding CSV/JSON export for each table supports the educational mission.

**Implementation:**

- Add an "Export" button to each data page (Orders, Positions, History, Portfolio holdings)
- Export as CSV with proper headers and formatting
- Use the `date-fns` library (already in stack) for date formatting in exports
- For the Portfolio equity chart, add a "Download chart as PNG" button

```tsx
function exportToCSV(data: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(h => {
          const val = row[h];
          return typeof val === 'string' && val.includes(',')
            ? `"${val}"`
            : val;
        })
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Priority:** P3 — Low  
**Effort:** 2–3 days  
**Impact:** ✅ Educational value ✅ User empowerment ✅ Data portability  
**Target metric:** 10%+ of users export data monthly

---

#### R19. Standardize All Toggle & Select Components

**Rationale:** The app currently uses:

- Hand-built toggle switches (Settings, Order Entry) with raw `<button>` elements
- Native `<select>` elements mixed with custom `<button>`-based selectors
- Inconsistent hover/active/focus states across these components
- This creates a perceived lack of polish

**Implementation:**

- Replace all custom toggle implementations with the standardized `Switch` component from shadcn/ui (already available in the codebase at `components/ui/switch.tsx`)
- Replace all native `<select>` elements with `Select` from shadcn/ui (`components/ui/select.tsx`)
- Ensure all buttons use the `Button` component (already imported in `OrderEntry.tsx` for submit, but not everywhere)

**Locations to standardize:**

- `Settings page` — Dark mode toggle, Order Confirmation toggle, all native `<select>` elements for Language/Currency
- `OrderEntry.tsx` — Spot/Margin toggle, Long/Short toggle, Leverage selector, Post-Only toggle
- `BottomPanel.tsx` — Tab switches
- All filter panels (Orders, History) — Convert `<select>` to `Select` component

**Priority:** P3 — Low  
**Effort:** 2–4 days  
**Impact:** ✅ Visual consistency ✅ Accessibility ✅ Maintenance  
**Target metric:** 100% of interactive elements use shadcn/ui components

---

#### R20. Add Performance Budget Monitors for Real-Time Features

**Rationale:** The SSE price stream, 1.5s worker tick, and 5s data polling in the BottomPanel could lead to performance degradation over time — especially with slow connections or many open tabs. Without monitoring, performance issues go undetected until users complain.

**Implementation:**

- Add a lightweight performance monitor component that tracks:
  - SSE message latency (time between server tick and DOM update)
  - Worker tick response time
  - API call duration for polling endpoints
  - Number of active WebSocket/SSE connections
- Log warnings to console when any metric exceeds thresholds:
  - SSE latency > 5s
  - Worker tick > 3s
  - API poll > 10s
- Add a `<PerformanceMonitor />` component that renders a small badge in dev mode (not visible to end users unless they toggle it)

```tsx
function PerformanceMonitor() {
  // Track metrics
  const [sseLatency, setSseLatency] = useState(0);
  const [tickDuration, setTickDuration] = useState(0);

  useEffect(() => {
    // Listen to SSE events with timestamps
    const interval = setInterval(() => {
      // Check SSE last update time
      const latency = Date.now() - lastSSEUpdate;
      setSseLatency(latency);
      if (latency > 5000) {
        console.warn(`[Perf] SSE latency: ${latency}ms`);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className='fixed bottom-2 left-2 z-50 flex gap-2 rounded-md bg-background/80 px-2 py-1 text-[9px] font-mono text-muted-foreground backdrop-blur'>
      <span className={sseLatency > 5000 ? 'text-negative' : 'text-positive'}>
        SSE: {sseLatency}ms
      </span>
      <span className={tickDuration > 3000 ? 'text-negative' : 'text-positive'}>
        Tick: {tickDuration}ms
      </span>
    </div>
  );
}
```

**Priority:** P3 — Low  
**Effort:** 1–2 days  
**Impact:** ✅ Performance visibility ✅ Developer debugging ✅ Proactive issue detection  
**Target metric:** 0 performance-regression incidents reaching production users

---

## 4. Page-by-Page Audit

### Dashboard (`/dashboard`)

| Issue                          | Priority | Recommendation                  |
| ------------------------------ | -------- | ------------------------------- |
| Mixed Hungarian/English labels | P0       | R3 — Unify to English           |
| Spinner loading — no skeleton  | P0       | R4 — Skeleton loading           |
| Empty states have no CTAs      | P1       | R9 — Actionable empty states    |
| No equity chart preview        | P2       | Add mini-sparkline to hero card |
| Color-only P&L indicators      | P1       | R6 — Add arrows/icons           |

### Trade (`/trade`)

| Issue                                | Priority | Recommendation               |
| ------------------------------------ | -------- | ---------------------------- |
| Risk Management collapsed by default | P1       | R5 — Expand by default       |
| No keyboard shortcut hints           | P2       | R14 — Inline hints + panel   |
| Settings reset on navigation         | P2       | R15 — Persist trade settings |
| No guided onboarding                 | P1       | R7 — Contextual tour         |
| Journal buried in bottom tab         | P2       | R11 — Elevate journal        |
| Empty states lack CTAs               | P1       | R9 — Actionable empty states |

### Portfolio (`/portfolio`)

| Issue                              | Priority | Recommendation               |
| ---------------------------------- | -------- | ---------------------------- |
| Spinner loading — no skeleton      | P0       | R4 — Skeleton loading        |
| Color-only P&L indicators          | P1       | R6 — Add arrows/icons        |
| No data export                     | P3       | R18 — CSV export             |
| Empty holdings/positions lack CTAs | P1       | R9 — Actionable empty states |

### Orders (`/orders`)

| Issue                                  | Priority | Recommendation                   |
| -------------------------------------- | -------- | -------------------------------- |
| Filter panels need extra click to show | P1       | Show filter counts in tab badges |
| Spinner loading — no skeleton          | P0       | R4 — Skeleton loading            |
| No column customization                | P2       | R12 — Column chooser             |
| Color-only status badges               | P1       | R6 — Add patterns/icons          |
| No data export                         | P3       | R18 — CSV export                 |

### Positions (`/positions`)

| Issue                            | Priority | Recommendation                           |
| -------------------------------- | -------- | ---------------------------------------- |
| Color-only liquidation risk dots | P1       | R6 — Add labels + icons                  |
| No column customization          | P2       | R12 — Column chooser                     |
| No bulk close action             | P2       | Add "Close All" button with confirmation |
| Empty state lacks CTA            | P1       | R9 — Actionable empty states             |

### History (`/history`)

| Issue                          | Priority | Recommendation                   |
| ------------------------------ | -------- | -------------------------------- |
| Filter panels need extra click | P1       | Show active filter badges in tab |
| No data export                 | P3       | R18 — CSV export                 |
| Empty state lacks CTA          | P1       | R9 — Actionable empty states     |

### Education (`/education`)

| Issue                            | Priority | Recommendation                   |
| -------------------------------- | -------- | -------------------------------- |
| No clear "next task" guidance    | P2       | Show suggested next task card    |
| Progress bar is tiny             | P2       | Make progress bar more prominent |
| No search/filter for order types | P3       | Add search bar                   |
| No dark/light demo chart         | P3       | Add interactive order type demo  |

### Settings (`/settings`)

| Issue                       | Priority | Recommendation                                |
| --------------------------- | -------- | --------------------------------------------- |
| Native `<select>` elements  | P3       | R19 — Standardize to shadcn Select            |
| Custom toggle switches      | P3       | R19 — Standardize to shadcn Switch            |
| No profile avatar upload    | P3       | Future enhancement                            |
| Password fields not grouped | P2       | Group current/new/confirm with visual section |

---

## 5. Accessibility Compliance Checklist

| WCAG 2.1 Criterion                         | Current Status | Target Status | Recommendations                                |
| ------------------------------------------ | -------------- | ------------- | ---------------------------------------------- |
| 1.4.1 — Use of Color (Non-Text Contrast)   | ❌ Fails       | ✅ Pass       | R6 (patterns + icons)                          |
| 1.4.3 — Contrast (Text)                    | ⚠️ Partial     | ✅ Pass       | R10 (typography scale)                         |
| 1.4.10 — Reflow (400% zoom)                | ⚠️ Partial     | ✅ Pass       | Responsive audit needed                        |
| 1.4.11 — Non-Text Contrast                 | ❌ Fails       | ✅ Pass       | Focus ring audit (R1)                          |
| 1.4.13 — Content on Hover/Focus            | ⚠️ Partial     | ✅ Pass       | Tooltip audit needed                           |
| 2.1.1 — Keyboard Navigation                | ❌ Fails       | ✅ Pass       | R1 (focus indicators)                          |
| 2.1.2 — No Keyboard Trap                   | ⚠️ Unknown     | ✅ Pass       | Modal audit needed                             |
| 2.4.7 — Focus Visible                      | ❌ Fails       | ✅ Pass       | R1 (focus rings)                               |
| 2.5.1 — Pointer Gestures                   | ⚠️ Partial     | ✅ Pass       | Add click alternatives                         |
| 3.2.4 — Consistent Identification          | ⚠️ Partial     | ✅ Pass       | R19 (standardize components)                   |
| 3.3.4 — Error Prevention (Legal/Financial) | ⚠️ Partial     | ✅ Pass       | Order confirmation dialog exists, needs review |
| 4.1.2 — Name, Role, Value                  | ❌ Fails       | ✅ Pass       | ARIA labels audit needed                       |
| 4.1.3 — Status Messages                    | ❌ Fails       | ✅ Pass       | R2 (aria-live regions)                         |

---

## 6. Measurement Plan

| Metric                                                              | Baseline (Estimated) | Target  | Measurement Method                              |
| ------------------------------------------------------------------- | -------------------- | ------- | ----------------------------------------------- |
| Task completion time (new user: place first trade)                  | ~3–5 min             | ≤2 min  | Session recording (e.g., LogRocket)             |
| Task completion time (returning: close position)                    | ~30–60 sec           | ≤20 sec | Session recording                               |
| Risk panel interaction rate (% of margin trades with risk settings) | <10%                 | >50%    | API analytics on `/api/orders` with risk params |
| Journal entry rate (% of trades with journal entry within 24h)      | <5%                  | >20%    | Publication analytics                           |
| Keyboard shortcut usage (% of orders submitted via shortcuts)       | <5%                  | >20%    | Custom analytics event                          |
| Empty state CTA click-through rate                                  | N/A (new)            | >25%    | Link click tracking                             |
| Color-blind accessibility compliance                                | ❌ Fails             | ✅ Pass | Axe-core + manual audit                         |
| New user bounce rate (leave within 30s)                             | ~40–60%              | <30%    | Analytics session duration                      |
| Onboarding completion rate (tour)                                   | N/A (new)            | >60%    | Tour step tracking                              |

---

### Effort Summary

| Priority Level    | Count  | Estimated Total Effort                                  |
| ----------------- | ------ | ------------------------------------------------------- |
| **P0 — Critical** | 4      | 5.5–8.5 days                                            |
| **P1 — High**     | 6      | 11–18 days                                              |
| **P2 — Medium**   | 5      | 13–19 days                                              |
| **P3 — Low**      | 5      | 11–16 days                                              |
| **Total**         | **20** | **40–62 days** (~2–3 months with 1 dedicated developer) |

---

## Recommended Sprint Plan

| Sprint       | Focus                          | Recommendations                                                                                                 |
| ------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| **Sprint 1** | Foundation & Accessibility     | R1 (Focus), R2 (ARIA Live), R3 (Language), R4 (Skeletons)                                                       |
| **Sprint 2** | Navigation & Empty States      | R7 (Onboarding), R8 (Quick actions), R9 (Empty state CTAs), R10 (Typography)                                    |
| **Sprint 3** | Trade Page & Feature Discovery | R5 (Risk panel), R11 (Journal), R14 (Keyboard shortcuts)                                                        |
| **Sprint 4** | Tables & Data                  | R6 (Color-blind), R12 (Column chooser), R15 (Smart defaults)                                                    |
| **Sprint 5** | Polish & Advanced              | R13 (Chart), R16 (Micro-interactions), R17 (Command palette), R18 (Export), R19 (Components), R20 (Performance) |

---

_Last updated: July 8, 2026_  
_Generated based on codebase analysis of Kraken Trading Simulator_
