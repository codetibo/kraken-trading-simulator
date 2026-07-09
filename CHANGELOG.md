# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> Versioning note: the app is pre-1.0 (`0.x`), so minor releases may contain
> breaking changes. Breaking changes are always called out under `### Breaking`
> below.

## [Unreleased]

### Added

- Contributor growth docs: `CONTRIBUTOR_GROWTH_GUIDE.md`, `docs/ARCHITECTURE.md`,
  `ROADMAP.md`, `GOVERNANCE.md`, `CONTRIBUTORS.md`.
- Issue templates (bug report, feature request) and a Discussions/security
  contact link in `.github/ISSUE_TEMPLATE/config.yml`.
- Automated dependency updates via Renovate (`renovate.json`).
- Authentication system with sign-in/sign-up pages and session management (R9).
- Trading Journal with CRUD, emotional state tracking, and inline editor (R8).
- Journal CTAs: dashboard widget, bottom-panel link, order-success action (R11).
- Responsive column choosers for data tables with localStorage persistence (R12).
- Progressively enhanced chart interactions: Candlestick/Line/Area toggle,
  compare overlay, crosshair markers, touch zoom (R13).
- Keyboard shortcuts panel with command palette (Ctrl+K), inline Kbd hints,
  first-visit trigger (R14).
- Smart defaults & context persistence: localStorage for trade settings,
  URL params for orders/history filters (R15).
- Backtest page with 3 built-in strategies (SMA Crossover, RSI, MACD).
- Portfolio analytics page: Sharpe/Sortino ratios, P&L distribution charts.
- Typography scale standardization (minimum 11px, R10).
- Faint borders on BUY/SELL/LONG/SHORT button inactive states.
- **Funding rate history chart**: Compact Recharts sparkline in margin details
  showing simulated 48h funding rate data with min/max stats.
- **24h cumulative cost estimate**: "Est. 24h Cost" row alongside the per-4h
  margin fee in the margin preview.
- **1W and 1M chart intervals**: Added 1 week and 1 month timeframes across all
  layers (chart-theme, price feeds, API routes, backtest limits).
- **Custom candle count selector**: Dropdown in chart toolbar (50/100/200/500/1000)
  with per-asset localStorage persistence.
- **Auto-adjust candle limit**: Candle count auto-adjusts to sensible defaults
  when interval changes (100 for sub-hourly, 200 for hourly/4h/weekly/monthly,
  500 for daily).
- **Visible YAxis on indicator panes**: RSI and MACD price scales now show
  labels and border lines for reading exact values.

### Changed

- **3-mode trading selector**: Replaced flat order-type dropdown with
  segmented buttons (Market / Limit / Advanced). Advanced mode shows a
  sub-selector for 8 advanced order types (Stop-Loss, Stop-Loss Limit,
  Take-Profit, Take-Profit Limit, Iceberg, Trailing Stop, Trailing Stop
  Limit, OCO).
- **Risk Management panel**: Added Price / Simple / Advanced tab system.
  - **Simple mode**: Take Profit and Stop Loss by % change, P&L USD, or
    USD exchange rate, with live trigger price preview. Includes trailing
    stop toggle.
  - **Advanced mode**: 3-field combination selector for profit-taking
    (Profit-Taking / Price Limits / Limit) × trigger (Distance / P&L) ×
    stop-loss (Stop-Loss / Limit-price Stop-Loss / Trailing Stop / Trailing
    Stop Limit), covering 36 combinations.
  - **Price mode**: Classic stop loss/take profit price inputs + trailing
    stop toggle (unchanged).
- **EducationTooltip**: Mode-aware descriptions — shows "Market Mode",
  "Limit Mode", or the specific advanced order type description.
- **OCO settings**: Time In Force and Trigger Type now available for OCO
  orders (previously missing).
- **Advanced mode order type persistence**: Switching from Advanced →
  Market/Limit → Advanced now restores the last selected advanced type
  instead of always resetting to Stop-Loss.
- **Margin order details**: Enhanced margin preview card now shows:
  Required Margin, Margin Status (%) with color-coded health indicator,
  Validity Period (GTC/IOC/FOK/GTD), Estimated Trading Fee (Taker + Maker),
  and Estimated Margin Fee (USD / 4 hours funding rate).
- **SPOT TP/SL support**: Take Profit, Stop Loss, and Trailing Stop
  conditional orders now work for SPOT BUY orders (not just MARGIN).
- **Mobile margin support**: Risk Management panel with all 3 TP/SL modes
  now available for SPOT trading.
- **RSI and MACD panes**: Now occupy separate non-overlapping zones when both
  are active (volume histogram hidden to avoid three-way overlap).
- **Chart toolbar**: Added "Cdl" label + hover tooltip to the candle count
  selector for immediate recognition.
- **Chart intervals**: Removed separator between 1D and new 1W/1M buttons — all
  intervals sit in a single row.

### Fixed

- **OCO timeInForce/triggerType**: OCO orders now correctly include
  `timeInForce` and `triggerType` in the request body (were silently
  omitted due to missing order type in the conditional check).
- **Advanced mode reset**: Switching trading modes no longer resets the
  advanced order type selection.
- **Backtesting annualization**: Fixed Sharpe ratio calculation for 1W, 1M,
  and 4h intervals (parseInt fallback produced wrong values).
- **Test gap**: Added 17 new integration tests for OCO timeInForce/triggerType
  flow across schema validation, server action, and component layers.

### Tests

- Expanded test suite from 449 to 597 tests across 36 suites.
- Added `convertAdvancedToOrderParams` tests: 36 tests covering all
  Field-1 × Field-2 × Field-3 combinations + edge cases for the Advanced
  TP/SL mode.
- Added OCO integration tests: schema validation with timeInForce/triggerType,
  server action handling, and OrderSettings component rendering.
- Added OrderSettings component test suite (13 tests).
- Added conditional trailing stop tests (5 tests for MARGIN LONG/SHORT,
  TRAILING_STOP_LIMIT, disabled, SPOT SELL).
- Added trigger conversion tests (53 tests for both Simple and Advanced modes).

### Security

- All conditional order fields (take profit, stop loss, trailing stop)
  pass through Zod schema validation to prevent silent field stripping.
- `tradingMode` state synced reactively with `orderType` to prevent
  stale mode/type mismatches.

## [0.1.0] - 2026-07-01

### Added

- Initial release: spot & margin trading simulator with virtual money.
- 8 order types, matching engine, margin/P&L/liquidation engine.
- Dashboard, trade, portfolio, orders, positions, history, journal, education,
  and backtest pages.
- Simulated price feed (GBM) and worker tick loop.
- Authentication via `better-auth`, PostgreSQL persistence via Prisma.
- CI pipeline: lint → typecheck → test → build → container deploy.

[Unreleased]: https://github.com/codetibo/kraken-trading-simulator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/codetibo/kraken-trading-simulator/releases/tag/v0.1.0
