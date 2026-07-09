# Contributing to Kraken Trading Simulator

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Contributing to Kraken Trading Simulator](#contributing-to-kraken-trading-simulator)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Getting Started](#getting-started)
    - [Claiming an issue (avoid duplicate work)](#claiming-an-issue-avoid-duplicate-work)
  - [Development Setup](#development-setup)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Running the Development Server](#running-the-development-server)
    - [Running Tests](#running-tests)
    - [Linting](#linting)
  - [Project Structure](#project-structure)
  - [Development Workflow](#development-workflow)
  - [Code Style](#code-style)
    - [TypeScript](#typescript)
    - [React/Next.js](#reactnextjs)
    - [Naming Conventions](#naming-conventions)
    - [Imports](#imports)
    - [Styling](#styling)
  - [Testing](#testing)
    - [Test data \& fixtures](#test-data--fixtures)
  - [Database](#database)
    - [Schema Changes](#schema-changes)
    - [Seeding](#seeding)
  - [Commit Guidelines](#commit-guidelines)
    - [Types](#types)
    - [Examples](#examples)
  - [Pull Request Process](#pull-request-process)
    - [PR Description Template](#pr-description-template)
  - [Definition of Done](#definition-of-done)
  - [Review process \& SLA](#review-process--sla)
  - [Community \& getting help](#community--getting-help)
  - [Questions?](#questions)

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and encourage diverse contributions
- Focus on constructive feedback
- Report unacceptable behavior to the project maintainers

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature or bugfix

```bash
git clone https://github.com/codetibo/kraken-trading-simulator.git
cd kraken-trading-simulator
git checkout -b feature/your-feature-name
```

### Claiming an issue (avoid duplicate work)

- Look for issues labeled [`good first issue`](https://github.com/codetibo/kraken-trading-simulator/labels/good%20first%20issue) or [`help wanted`](https://github.com/codetibo/kraken-trading-simulator/labels/help%20wanted).
- Comment **"I'd like to take this"** on the issue. A maintainer will assign it to you (this prevents two people doing the same work).
- If an issue is unassigned and has had no activity for a week, feel free to claim it.
- Stuck? Ask in [Discussions](https://github.com/codetibo/kraken-trading-simulator/discussions) — no question is too small.

## Development Setup

### Prerequisites

- Node.js >= 20
- PostgreSQL >= 14
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure your database connection in .env
# DATABASE_URL="postgresql://user:password@localhost:5432/kraken_simulator"

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed the database with initial data
npm run seed
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Linting

```bash
npm run lint
```

## Project Structure

```
app/                          # Next.js App Router pages and layouts
  api/                        # API routes (REST endpoints)
  (main)/                     # Main application routes
    dashboard/                # Dashboard page
    trade/                    # Trading interface
    portfolio/                # Portfolio analytics
    orders/                   # Order management
    positions/                # Position management
    history/                  # Trade history
    journal/                  # Trading journal
    settings/                 # User settings
    education/                # Educational content
    backtest/                 # Backtesting tools

components/                   # React components
  ui/                         # shadcn/ui components
  layout/                     # Layout components (Sidebar, TopBar)
  trade/                      # Trading-specific components
  dashboard/                  # Dashboard components
  providers/                  # Context providers

lib/                          # Core business logic
  engine/                     # Trading engine
    matchingEngine.ts         # Order matching logic
    marginEngine.ts           # Margin and P&L calculations
    priceFeed/                # Price feed implementations
  validation/                 # Zod schemas for validation
  prisma.ts                   # Prisma client singleton
  utils.ts                    # Utility functions

server/actions/               # Server Actions
prisma/                       # Database schema and migrations
```

## Development Workflow

1. **Create a branch** from `main` for your changes
2. **Make your changes** following the code style guidelines
3. **Write tests** for new functionality
4. **Run linting and tests** to ensure everything passes
5. **Commit your changes** with a descriptive message
6. **Push to your fork** and open a Pull Request

## Code Style

### TypeScript

- Use TypeScript for all new code
- Prefer interfaces over types for object shapes
- Use strict type checking (`strict: true` in tsconfig)
- Avoid `any` — use `unknown` when the type is truly unknown

### React/Next.js

- Use Server Components by default; add `"use client"` only when necessary
- Keep client components small and focused
- Use the App Router conventions
- Follow the existing component patterns in the codebase

### Naming Conventions

- **Files**: Use PascalCase for components (`TradingChart.tsx`), camelCase for utilities (`formatUsd.ts`)
- **Components**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

### Imports

- Group imports: React → Next.js → third-party → internal → relative
- Use path aliases (`@/`) for internal imports when configured
- Avoid deep relative imports (`../../../../`)

### Styling

- Use Tailwind CSS utility classes
- Follow the existing design system (shadcn/ui components)
- Support both dark and light themes using CSS variables
- Use `cn()` utility for conditional class names

## Testing

- Write unit tests for business logic (matching engine, margin engine)
- Write integration tests for API routes
- Use Jest as the test runner
- Place tests alongside the code they test or in a `__tests__` directory
- Aim for meaningful test coverage, not just high percentages

### Test data & fixtures

- The engine is pure, so most tests build inputs inline (e.g., a fake `OrderBook`) — no database required. See `lib/engine/*.test.ts` for patterns.
- For DB-backed tests, the Prisma seed (`npm run seed`) provides 5 crypto pairs you can rely on.
- Run a single test file fast:

```bash
npx jest lib/engine/matchingEngine
```

## Database

### Schema Changes

1. Modify `prisma/schema.prisma`
2. Create a migration:
   ```bash
   npm run prisma:migrate -- --name description_of_change
   ```
3. Regenerate the client:
   ```bash
   npm run prisma:generate
   ```

### Seeding

```bash
npm run seed
```

## Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring without changing behavior
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates
- `ci`: CI/CD changes

### Examples

```
feat(trade): add support for OCO orders
fix(portfolio): correct margin level calculation
docs(readme): update installation instructions
refactor(engine): extract order validation logic
```

## Pull Request Process

1. Ensure your branch is up to date with `main`
2. Run `npm run lint` and `npm test` — all must pass
3. Update documentation if your changes affect the API or user-facing features
4. Open a Pull Request with a clear title and description
5. Link any related issues
6. Be responsive to review feedback

### PR Description Template

```markdown
## Summary

Brief description of the changes

## Motivation

Why is this change needed?

## Changes

- List of specific changes made

## Testing

How was this tested?

## Screenshots (if applicable)
```

## Definition of Done

A PR is ready to merge when:

- [ ] CI is green (lint, typecheck, test, build)
- [ ] Tests cover the new behavior (or a justification is given for why not)
- [ ] Docs/README updated if user-facing or API behavior changed
- [ ] Linked to the related issue (e.g., `Closes #123`)
- [ ] Self-reviewed using the PR template checklist

## Review process & SLA

- We aim to give **first feedback within 2 business days**.
- Reviews are **kind and specific**: we explain _why_ when we request a change and prefer GitHub "suggested changes" over vague notes.
- We never say "this is wrong" without a reason. Questions are welcome.
- Once approved and CI is green, a maintainer merges. See [GOVERNANCE.md](./GOVERNANCE.md) for how reviewers become maintainers.

## Community & getting help

- **Questions & ideas:** [GitHub Discussions](https://github.com/codetibo/kraken-trading-simulator/discussions) (Q&A and Ideas categories).
- **Security issues:** report privately via [Security Advisories](https://github.com/codetibo/kraken-trading-simulator/security/advisories/new) — see [SECURITY.md](./SECURITY.md).
- **Email:** [codetibo@proton.me](mailto:codetibo@proton.me).
- **Roadmap:** see [ROADMAP.md](./ROADMAP.md) to pick aligned work.
- **Architecture:** read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) before large changes.

## Questions?

If you have questions about contributing, feel free to open an issue for discussion before starting work on a larger change.
