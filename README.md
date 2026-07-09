# Kraken-style Spot & Margin Trading Simulator

A trading simulator for educational purposes, working exclusively with virtual money.
**No real stock exchange connection, no real financial orders.**

## Features

- **Spot & Margin trading** with 14 order types across 3 trading modes:
  - **Market mode** — instant execution at best available price
  - **Limit mode** — execute at a specified price or better
  - **Advanced mode** — 8 order types: Stop Loss, Stop Loss Limit, Take Profit, Take Profit Limit, Iceberg, Trailing Stop, Trailing Stop Limit, OCO
  - Plus: TWAP, Post-Only Limit, Reduce Only, Settle Position
- **Full authentication** via `better-auth` (email/password) — multi-user support with per-user data isolation
- **Real-time simulated prices** (Geometric Brownian Motion) with optional Binance live feed
- **Recurring worker** evaluates open orders every 1.5s — trigger orders execute automatically
- **Portfolio analytics** — Sharpe/Sortino ratios, max drawdown, win rate, P&L distribution charts
- **Backtesting engine** — 3 built-in strategies (SMA Crossover, RSI, MACD) against historical data
- **Custom technical indicators** — SMA, EMA, Bollinger Bands, RSI, MACD overlays on chart
- **Trading Journal** — inline editor in trade page + dedicated `/journal` page + Dashboard widget
- **Keyboard shortcuts** — Ctrl+B/S (Buy/Sell), Ctrl+K (command palette), ↑/↓ (quantity), 1-5 (leverage), ?
- **Command palette** (`Ctrl+K`) — search assets and pages, navigate instantly
- **Chart interactions** — Candlestick/Line/Area toggle, compare overlay, touch zoom/scroll
- **Responsive column choosers** — gear icon per table to toggle visible columns, persisted in localStorage
- **Smart defaults** — trade settings (order type, side, leverage, chart interval) persist per asset in localStorage
- **URL-persisted filters** — Orders and History pages preserve filters in search params across refreshes
- **Error boundaries** with graceful fallbacks at every level
- **Dark/light theme** with smooth transitions and theme-aware charts
- **Responsive design** — Desktop, Tablet (768–1024px), Mobile (<768px) with adaptive layouts
- **60+ shadcn/ui components**, Framer Motion animations, Sonner toasts

## Pages

### Dashboard (`/dashboard`)
- Equity hero card with total portfolio value & P&L percentage
- Portfolio breakdown (cash, crypto, margin used)
- Margin overview with colored status indicator
- Daily & overall P&L summary
- Open positions mini-table
- Recent trades table
- **Recent Journal Entries** widget — shows last 3 entries with asset badge, emotion icons, tags, links to full journal
- **Price Feed Health** — live indicator of price feed mode and Binance connectivity

### Trade (`/trade`) — Most complex page

- **Responsive design**: Three breakpoints — Desktop (>1024px), Tablet (768–1024px), Mobile (<768px)
- **Desktop**: 3-column resizable layout — Watchlist | Chart + Right panel (Order Entry / Order Book) | Bottom tabs (Open Orders, Positions, Order History, Trade History, Journal)
- **Tablet**: Vertical stacked layout with Sheet-based Watchlist (slide from left via hamburger menu), simplified chart, Order Entry + Order Book side-by-side
- **Mobile**: Full-width simplified chart, Sheet-based Watchlist, floating "Trade" button opens Order Entry in a Drawer with snap points (50%/90%)
- **Watchlist**: search & filter, sort by Name/Price/Change/Volume, pin favorites (localStorage), hide pairs  - **Chart**: TradingView Lightweight Charts with crosshair axis labels, volume histogram (desktop)
  - **Chart type toggle**: Candlestick / Line / Area — toolbar buttons with icons
  - **Compare mode**: overlay a second asset's price as dashed line for spread analysis
  - **Touch zoom/scroll**: `horzTouchDrag` and `pinch` enabled on mobile
  - **Custom indicators**: SMA, EMA, Bollinger Bands, RSI, MACD — toggleable overlays with separate non-overlapping Y-axis panes for RSI and MACD
  - **Timeframes**: 1m, 5m, 15m, 1h, 4h, 1D, 1W, 1M with auto-adjusted candle counts
  - **Candle count selector**: choose between 50/100/200/500/1000 candles per view
- **Order Entry**:
  - Spot/Margin toggle + 14 order types with education tooltips
  - Inline keyboard shortcut hints (`Ctrl+B` / `Ctrl+S` / `Ctrl+Enter`)
  - Available balance display for BUY (USD) and SELL (asset holdings)
  - Margin: Long/Short toggle (with inactive borders), Leverage 2x-5x (keyboard shortcut 1-5)
  - Enhanced live preview: position size, notional, required margin, margin status (%) with color-coded health indicator, liquidation price/distance
  - Order details: validity period (GTC/IOC/FOK/GTD), estimated trading fee (Taker + Maker), estimated margin fee with 4h and 24h cost estimates
  - Funding rate history chart: compact Recharts sparkline showing 48h of simulated funding rates with min/max stats
  - **Risk Management panel**: 3-tab system — **Price** (classic SL/TP + trailing stop), **Simple** (TP/SL by % change, P&L USD, or exchange rate with live price preview + trailing stop toggle), **Advanced** (3-field combination for profit-taking × trigger × stop-loss, covering 36 strategies)
  - Account Risk % presets, R:R Ratio display, suggested position size
  - **Quantity ↑/↓ adjustment** — smart increments (0.001/0.01/0.1/1/10 based on magnitude)
  - **Conditional take profit / stop loss / trailing stop** attached to MARKET and LIMIT orders — works for both SPOT BUY and MARGIN
  - **Order Confirmation** (configurable in Settings) — AlertDialog with full details before submit
  - **Undo Toast** — Sonner toast with "Undo" button for OPEN/PARTIALLY_FILLED orders (5s duration)
  - **Journal this trade** — link to `/journal` after successful order
  - **Smart defaults**: marketType, orderType, side, positionSide, leverage persist per asset in localStorage
- **Keyboard Shortcuts**:
  | Shortcut | Action |
  |----------|--------|
  | `Ctrl+B` | Buy Market |
  | `Ctrl+S` | Sell Market |
  | `Ctrl+Enter` | Submit order |
  | `Ctrl+K` | Command palette |
  | `1`–`5` | Select leverage (2x–5x) |
  | `↑`/`↓` | Adjust quantity |
  | `Esc` | Dismiss modals |
  | `?` | Toggle shortcuts help |
  - **First-visit** auto-opens help dialog after 2s (localStorage-persisted)
  - **KeyboardShortcutsButton** in TopBar toggles help dialog
- **Command Palette** (`Ctrl+K`): searchable modal for 9 pages + 5 assets with keyboard navigation
- **Backtesting Engine** (`/backtest`):
  - 3 built-in strategies: SMA Crossover, RSI, MACD
  - Configurable: asset, interval, capital, position size, fee, slippage
  - Performance report: total return, win rate, max drawdown, Sharpe, profit factor
  - Equity curve tracked every candle
  - Uses real Binance historical data
- **Order Book & Depth Chart**:
  - 8-level bid/ask table with horizontal depth bars
  - Spread display with absolute and percentage
  - Recharts stepped area chart with gradient fill, tooltips, market depth ratio
  - Real-time updates via SSE price stream
- **Bottom tabs**: Open Orders (cancel), Positions (close), Order History, Trade History, Journal
  - Journal inline editor + "Open full Trading Journal" link at the bottom

### Portfolio (`/portfolio`)
- **Total Equity Hero** with overall P&L and percentage badge
- **Cash Balance** card with free margin detail
- **P&L Summary** — daily (24h) and overall PnL with percentages
- **Equity Curve Chart** (24h) — Recharts interactive area chart with gradient fill
- **Crypto Holdings Table** — with column chooser (gear icon, responsive defaults)
- **Margin Positions Table** — with column chooser, liquidation risk indicators
- **Portfolio Breakdown** card — cash, crypto, margin used, total equity
- **Margin Overview** card — used/free margin with level indicator

### Portfolio Analytics (`/portfolio`)
- **Performance Metrics**: Sharpe Ratio, Sortino Ratio, Max Drawdown, Win Rate, Avg R:R, Profit Factor
- **Trade Summary**: winning/losing trade counts with visual bar, average win/loss
- **Monthly & Weekly P&L Bar Charts** — Recharts with color-coded bars, tooltips
- **P&L Distribution Histogram** — dynamically bucketed trade PnL distribution
- All metrics computed server-side via `GET /api/portfolio/analytics`

### Orders (`/orders`)
- **Tab navigation**: Open Orders / Order History / Cancelled (persisted in URL params)
- **Open Orders** table with column chooser — pair, type, side, quantity, price, trigger, market, status, cancel
- **Order History** with multi-dimensional filters — pair (text), type, side, status, date range (URL-persisted)
- **Cancelled Orders** tab — filtered view with column chooser
- **Status badges**: OPEN=blue, PARTIALLY_FILLED=amber, FILLED=green, CANCELLED=gray, TRIGGERED=accent
- **Refresh button**, responsive collapsible filter panel

### Positions (`/positions`)
- **Open Positions table** with column chooser — pair, side (LONG/SHORT badges), size, entry/mark price, PnL, ROE, liquidation price, leverage, margin
- **Liquidation risk indicator**: color-coded dot (green/amber/red) + percentage distance
- **Close position** button per row with loading state
- **Summary cards**: total positions, total size, unrealized PnL, total margin used

### History (`/history`)
- **Tab navigation**: Trade History / Transaction Log (persisted in URL params)
- **Trade History** with filters — pair, type, side, date range (24h/7d/30d/90d) + column chooser
- **Transaction Log** with filters — type, date range, note search
- **Transaction type badges**: DEPOSIT=green, WITHDRAWAL=red, TRADE_FEE=gray, FUNDING_FEE=amber, REALIZED_PNL=accent, RESET_ADJUSTMENT=blue
- **Refresh button**, collapsible filter panels with Apply/Clear

### Journal (`/journal`)
- **Trading Journal** — full CRUD journal entries with emotional state tracking
- **Entry form**: date, asset symbol selector, tags, emotional state (happy, calm, anxious, fearful, greedy, confused, frustrated, neutral, satisfied), notes (textarea)
- **Entry list**: date, asset badge, emotion icon, tags, truncated notes, edit/delete buttons
- **Emotional state icons**: Brain, Heart, Zap, Frown, AlertTriangle, Smile, HelpCircle, Meh, Check
- **Entry counter** — total journal entries count
- **Quick access**: "Journal this trade" link in OrderEntry success + "Open full Journal" in BottomPanel tab
- **Dashboard widget**: Recent Journal Entries with "Start Journaling" / "View all" links

### Education (`/education`)
- **Order Types reference** — 8 interactive accordion-style cards (Market, Limit, Stop Loss, Stop Limit, Take Profit, Take Profit Limit, Trailing Stop, Trailing Stop Limit)
- Each card: what it is, how to use, when to use, advantages, disadvantages, example
- **Interactive Tutorial** — 6 hands-on tasks with progress tracking
- **Progress bar**, completion %, task count, reset button

### Settings (`/settings`)
- **Dark Mode toggle** — syncs with next-themes, persisted to DB
- **Language selector** — English, Magyar, Deutsch, Français, Español, 中文
- **Display Currency** — USD, EUR, GBP, JPY
- **Starting Balance** — preset buttons ($1K–$100K) + custom input
- **Price Feed Source** — Simulated vs Live (Binance) toggle with Wifi/WifiOff icons
- **Reset Simulation** — confirmation dialog with detail of what gets deleted
- **Order Confirmation** toggle — enables/disables the pre-submit confirmation dialog

### Backtest (`/backtest`)
- Run strategies against historical candle data
- 3 built-in strategies: SMA Crossover, RSI, MACD
- Configurable: asset, interval, capital, position size, fee, slippage
- Performance report: return, trades, win rate, drawdown, Sharpe, profit factor
- Trade log with entry/exit prices, PnL, holding period
- Equity curve tracked every candle
- Uses real Binance historical data via `BinancePriceFeed.getCandles()`

## State Management (Zustand)

| Store                  | State                                                                                             | Purpose                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `useTradeStore`        | selectedPair, chartInterval, orderType, marketType, side, positionSide, leverage, activeBottomTab | Global trade page state                                           |
| `usePortfolioStore`    | summary (cashBalance, totalEquity, PnL), loading, error, lastRefreshed                            | Portfolio summary with periodic polling (`startPortfolioPolling`) |
| `useNotificationStore` | history (up to 50 entries), notify, clearHistory                                                  | Toast notification queue with Sonner integration                  |

### Store Integration

- **Dashboard**: Wrapped in `<StoreProvider showWelcome>` — portfolio polling + welcome toast (once per session via `sessionStorage`)
- **Portfolio**: Wrapped in `<StoreProvider>` — portfolio polling on mount
- **Trade page**: Portfolio polling started in `AssetProvider` wrapper
- **OrderEntry**: Notifications on order success (`order_filled`) and failure (`error`)
- **BottomPanel**: Notifications on order cancel (`order_cancelled`) and position close (`position_closed`)

## Recurring Worker

- **`GET /api/worker/tick`** — evaluates all OPEN/PARTIALLY_FILLED orders with current price
  - Handles trigger activation (Stop/Take Profit/Trailing → child orders)
  - Executes fills (Market/Limit), updates trailing high-water marks
  - Runs `checkLiquidations()` for margin positions
  - Returns stats: ordersEvaluated, triggers, fills, liquidations, tickTimeMs
- **`WorkerTick` component** — invisible client component in root layout, calls `/api/worker/tick` every 1.5s

## Real-time Price Streaming

- **SSE endpoint**: `GET /api/prices/stream` — pushes price ticks to browser
- **`usePriceStream` hook**: SSE with polling fallback (3s), reconnects every 30s
- **Live indicators**: green (connected) / amber (polling) dot in TickerTape
- **Watchlist**: live price map from SSE, ticker metadata every 10s
- **TickerTape**: SSE connection with fallback polling + status indicator

## Theme System

- **Dark/light mode** with `next-themes` — toggle via sidebar button, persisted to DB
- **CSS custom properties** for all theme colors (background, foreground, panel, border, muted, accent, positive, negative, chart, sidebar)
- **Light theme**: panel backgrounds (oklch 0.955), borders (oklch 0.85), muted foreground (oklch 0.47)
- **Dark theme**: deep backgrounds (oklch 0.13), subtle borders (10% white), bright foreground (oklch 0.985)
- **Chart colors**: theme-aware 5-hue spectrum — vibrant in both modes
- **Theme transition**: smooth 0.3s ease — disabled via `.no-transition` class

## Error Handling

- **React Error Boundary** — class-based, wraps main `<main>` content, shows user-friendly fallback with retry button, collapsible error details
- **Next.js `error.tsx`** (`app/error.tsx`) + **`global-error.tsx`** (`app/global-error.tsx`) — route segment and root-level error pages
- **`ErrorFallback` component** — reusable Card + Button, accepts `message`, `error`, `onRetry`, optional `action` prop
- **Console logging** — `componentDidCatch` logs errors with label prefix

## Column Choosers

All data tables feature a **gear icon** button that opens a dropdown of toggleable column visibility:

- **Desktop**: All columns shown by default
- **Tablet (<1024px)**: Non-critical columns (Fee, Market, Trigger) hidden by default
- **Mobile (<768px)**: Only 4-5 core columns shown (Time, Pair, Side, Price, PnL)
- **Persistence**: Preferences stored in localStorage per table
- **Reset**: "Reset to defaults" button in each column chooser

**Tables with column choosers**: Orders (open + history), Positions, History (trades), Portfolio (holdings + margin positions)

## Smart Defaults & Context Persistence

- **Trade settings per asset** (localStorage): marketType, orderType, side, positionSide, leverage, chartInterval — keyed by asset symbol (`trade_settings_v1_BTC_USD`)
- **Orders page**: activeTab + 5 filters persisted in URL search params (`?tab=history&pair=BTC&type=LIMIT`)
- **History page**: activeTab + trade/transaction filter sets persisted in URL search params

## API Routes Summary

| Endpoint                   | Method          | Description                                        |
| -------------------------- | --------------- | -------------------------------------------------- |
| `/api/market`              | GET             | All asset tickers with price, 24h change, volume   |
| `/api/market/candles`      | GET             | OHLCV data by symbol/interval/limit                |
| `/api/orders`              | GET             | Orders list (?status=open\|history\|all)            |
| `/api/orders`              | POST            | Place an order                                     |
| `/api/orders/open`         | GET             | Open orders                                        |
| `/api/orders/history`      | GET             | Order history                                      |
| `/api/orders/[id]`         | DELETE          | Cancel an order                                    |
| `/api/positions`           | GET             | Open positions                                     |
| `/api/positions/[id]`      | DELETE          | Close a position                                   |
| `/api/portfolio`           | GET             | Portfolio summary (for store polling)              |
| `/api/portfolio/analytics` | GET             | Performance metrics (Sharpe, Sortino, drawdown...) |
| `/api/holdings`            | GET             | Spot crypto holdings with current prices           |
| `/api/prices/stream`       | GET             | SSE stream for real-time price updates             |
| `/api/prices/health`       | GET             | Price feed health (mode, latency, rate limit)      |
| `/api/trades`              | GET             | Trade history with filters                         |
| `/api/trades/recent`       | GET             | Recent trades (last 8)                             |
| `/api/transactions`        | GET             | Transaction log with filters                       |
| `/api/history`             | GET             | Unified history (?type=trades\|transactions\|all)   |
| `/api/worker/tick`         | GET             | Recurring order evaluation tick                    |
| `/api/settings`            | GET/PATCH       | User settings                                      |
| `/api/tutorial`            | GET/POST/DELETE | Tutorial progress                                  |
| `/api/journal`             | GET/POST        | Journal entries list + create                      |
| `/api/journal/[id]`        | PATCH/DELETE    | Update or delete a journal entry                   |
| `/api/reset`               | POST            | Reset simulation                                   |
| `/api/auth/*`              | various         | Better Auth endpoints (sign-in, sign-up, session)  |
| `/api/backtest`            | POST            | Run a backtest strategy                            |

## Project Structure

```
app/
  (main)/
    dashboard/          # Dashboard page
    trade/              # Main trading page
    portfolio/          # Portfolio + analytics
    orders/             # Order management
    positions/          # Position management
    history/            # Trade history + transaction log
    journal/            # Trading journal
    education/          # Educational content
    settings/           # User settings
    backtest/           # Backtesting tool
  sign-in/              # Auth sign-in page
  sign-up/              # Auth sign-up page
  api/                  # API routes

components/
  ui/                   # 60+ shadcn/ui components
  layout/               # Sidebar, TopBar, KeyboardShortcutsButton
  trade/                # TradingChart, OrderEntry, BottomPanel, Watchlist, etc.
  dashboard/            # Dashboard-specific components
  ticker/               # TickerTape price marquee

lib/
  engine/               # matchingEngine, marginEngine, backtesting, types
    priceFeed/          # PriceFeedProvider, SimulatedPriceFeed, BinancePriceFeed
  validation/           # Zod schemas for all order types
  trade-settings.ts     # localStorage persistence utility
  indicators.ts         # SMA, EMA, RSI, MACD, Bollinger Bands calculations
  auth.ts               # Better Auth configuration
  prisma.ts             # Prisma client singleton
  utils.ts              # cn, formatUsd, formatPercent, formatNumber

hooks/
  useKeyboardShortcuts.ts   # Global key bindings
  usePriceStream.ts         # SSE + polling price stream
  usePanelResize.ts         # Resizable panel logic
  useResponsive.ts          # Breakpoint detection

store/                # Zustand stores (tradeStore, portfolioStore, notificationStore)
server/actions/       # Server actions (orders, positions, portfolio, journal, etc.)
prisma/               # Schema + migrations
```

## Tests

The project has **36 test suites with 597 tests** across the following files:

| Test File                              | Tests | Coverage                                                    |
| -------------------------------------- | ----- | ----------------------------------------------------------- |
| `matchingEngine.test.ts`               | ~20   | All 14 order types + edge cases                             |
| `marginEngine.test.ts`                 | ~15   | Margin, PnL, liquidation, risk/reward                       |
| `types.test.ts`                        | ~5    | isValidLeverage                                             |
| `utils.test.ts`                        | ~5    | formatUsd, formatPercent, formatNumber                      |
| `indicators.test.ts`                   | ~10   | SMA, EMA, RSI, MACD, Bollinger Bands                        |
| `orderSchemas.test.ts`                 | ~25   | Zod validation for all 14 order types + common fields       |
| `triggerConversion.test.ts`            | 53    | Simple + Advanced TP/SL trigger conversion                   |
| `auth.test.ts`                         | ~5    | Authentication flow                                         |
| `stores.test.ts`                       | 9     | TradeStore, PortfolioStore, Notifications                   |
| `store-integration.test.ts`            | 11    | Store + component integration                               |
| `orders-actions.test.ts`               | 42    | createOrder (all types), cancel, list, conditional orders   |
| `positions-actions.test.ts`            | 14    | listOpenPositions, closePosition, liquidate                 |
| `portfolio-actions.test.ts`            | ~8    | getHoldings, getEquityHistory                               |
| `portfolio-summary.test.ts`            | 12    | getPortfolioSummary, getRecentTrades, reset                 |
| `history-actions.test.ts`              | 8     | listTradeHistory, listTransactions w/ filters               |
| `settings-actions.test.ts`             | 6     | getSettings, updateSettings                                 |
| `tutorial-actions.test.ts`             | 7     | getTutorialProgress, completeTask, reset                    |
| `OrderSettings.test.tsx`              | 13    | TimeInForce, TriggerType, Post Only rendering by order type |
| + page-level component test files      | var.  | Orders, Positions, Education, History, OrderFormInputs, etc. |

```bash
npm test           # Run all Jest tests
npm run test:watch # Watch mode
```

## Local installation

### Option A: Docker Compose (recommended, zero-config)

Requires [Docker](https://docs.docker.com/get-docker/) + Docker Compose v2.

```bash
docker compose up          # build & start (foreground logs)
docker compose up -d       # start in background
```

- App: http://localhost:3000
- Postgres: localhost:5432 (user `postgres`, db `kraken_trading_simulator`)
- Demo login: `demo@kraken-simulator.local` / `demo123456`

```bash
docker compose down        # stop (keeps DB volume)
docker compose down -v     # also delete database volume
docker compose logs -f app # follow app logs
```

### Option B: Manual setup

1. **PostgreSQL** – local or Docker:
```bash
docker run --name trading-sim-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16
```

2. **Environment**:
```bash
cp .env.example .env
```

3. **Install**:
```bash
npm install
```

4. **DB migration + seed**:
```bash
npm run prisma:migrate
npm run seed
```

5. **Dev server**:
```bash
npm run dev
```

## CI/CD

- **GitHub Actions** (`.github/workflows/ci-cd.yml`): lint → typecheck → test → build → deploy
- **Renovate** (`renovate.json`): automated dependency updates

## Important design decisions

- **Isolated margin model**: each position has its own margin (no cross-margin) — more transparent for education
- **`reservedMargin`**: margin orders reserve capital immediately, preventing double-spending
- **Trigger orders (Stop/Take Profit/Trailing)**: child orders created on activation, parent set to `TRIGGERED` — complete audit trail
- **`PriceFeedProvider` interface**: engine never imports SimulatedPriceFeed directly — pluggable by design
- **Engine is pure**: no I/O, no database — fully unit-testable
- **Server actions**: thin orchestration layer between engine and database — the only place that mixes both

## Contributing

We welcome contributions of all kinds. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, testing guide, and PR process.

- **Find work**: [`good first issue`](https://github.com/codetibo/kraken-trading-simulator/labels/good%20first%20issue) or [`help wanted`](https://github.com/codetibo/kraken-trading-simulator/labels/help%20wanted)
- **Architecture**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Roadmap**: [ROADMAP.md](./ROADMAP.md)
- **Contributors**: [CONTRIBUTORS.md](./CONTRIBUTORS.md)

All participants must follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Community & support

- **Questions & ideas**: [GitHub Discussions](https://github.com/codetibo/kraken-trading-simulator/discussions)
- **Bug reports / features**: use issue templates
- **Security**: report via [Security Advisories](https://github.com/codetibo/kraken-trading-simulator/security/advisories/new) — see [SECURITY.md](./SECURITY.md)
- **Email**: [codetibo@proton.me](mailto:codetibo@proton.me)

## License

Released under the [MIT License](./LICENSE).
