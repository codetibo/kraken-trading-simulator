# Roadmap

This roadmap shows what we're working toward so contributors can self-select
aligned work. It is **aspirational, not a commitment** — priorities shift with
community interest and available help.

## How to use this

- Pick an item, comment on its issue to claim it, and follow
  [CONTRIBUTING.md](./CONTRIBUTING.md).
- Items labeled `good first issue` are scoped for first-time contributors.
- Larger items are great for experienced devs and domain experts (trading/finance).

## Themes

### Q3 2026 — Hardening & onboarding

- [ ] Fill out test coverage for `lib/engine` (matching + margin) to ≥ 90%.
- [ ] Add a "Start here 👋" pinned issue linking `good first issue` filtered view.
- [ ] Publish a 10-minute Loom walkthrough: "add an order type end-to-end".
- [ ] Enable GitHub Discussions (Q&A + Ideas categories).

### Q4 2026 — Trading depth

- [ ] Indicator framework: implement `PriceFeedProvider`-style `Indicator`
      interface + RSI/MACD examples.
- [ ] Backtest improvements: parameter sweeps + exportable reports.
- [ ] Risk-management presets contributed by domain experts.

### 2027 — Scale & ecosystem

- [ ] Plugin/strategy API so users can script bots against the simulated feed.
- [ ] Localization of docs (zh-CN, es) — see `CONTRIBUTING.md`.
- [ ] Performance benchmarks in CI for the matching engine (`npm run bench`).
- [ ] Public demo deployment + one-click `docker compose up` for contributors.

## Done

- [x] v0.1.0 — core simulator, 8 order types, auth, CI/CD (2026-07-01).
- [x] Contributor growth docs & issue templates (2026-07).
- [x] Auth system — Better Auth with email/password, sign-in/sign-up pages, session management.
- [x] Trading Journal — CRUD entries, emotional state tracking, inline editor in trade page.
- [x] Journal CTAs — Dashboard widget, bottom-panel link, order-success journal action.
- [x] Responsive column choosers — Gear icon per table, localStorage persistence, responsive defaults.
- [x] Chart interactions — Candlestick/Line/Area toggle, compare overlay, crosshair markers.
- [x] Keyboard shortcuts panel — Ctrl+K command palette, ↑/↓ quantity, inline Kbd hints, first-visit trigger.
- [x] Smart defaults & context persistence — localStorage for trade settings, URL params for page filters.
- [x] New order types: OCO, trailing stop, trailing stop limit, post-only limit.
- [x] 3-mode trading selector (Market / Limit / Advanced) with 8 advanced order types.
- [x] TP/SL Risk Management panel with 3-tab system (Price / Simple / Advanced).
- [x] Education tooltips per trading mode (Market, Limit, Advanced).
- [x] Enhanced margin order details (required margin, margin status, validity period, fees).
- [x] SPOT TP/SL support for BUY orders.
- [x] OCO timeInForce/triggerType integration.
- [x] Trigger conversion utility (53 tests) for Simple and Advanced TP/SL modes.
- [x] Funding rate history chart with 24h cumulative cost estimate in margin details.
- [x] 1W and 1M chart intervals across all layers (price feeds, API, backtest).
- [x] Custom candle count selector (50–1000) with per-asset persistence and auto-adjust on interval change.
- [x] RSI/MACD non-overlapping indicator panes with visible Y-axis labels and borders.
- [x] Backtesting annualization fix for 1W, 1M, and 4h intervals.

## Proposing changes

Open a [feature request](https://github.com/codetibo/kraken-trading-simulator/issues/new?template=feature_request.md)
or start a thread in Discussions. Big changes go through a short RFC in
`docs/rfcs/` (see [GOVERNANCE.md](./GOVERNANCE.md)).
