# Attracting, Onboarding, and Retaining Voluntary Contributors

A practical, prioritized playbook for **any** open-source repository — web app, CLI, library, data, or hardware project. Every recommendation is concrete and non-generic, with a real-world example, the tangible benefit for **contributors** and for **maintainers**, and notes on tailoring it to three contributor segments:

- **First-time OSS contributors** (new to open source entirely)
- **Experienced OSS developers** (comfortable with git/PRs, new to _your_ codebase)
- **Domain-specific experts** (deep knowledge of the problem space, e.g. trading, ML, hardware)

---

## How to read the tiers

| Tier                            | Meaning                                                                  |
| ------------------------------- | ------------------------------------------------------------------------ |
| **Mandatory (Core)**            | Without these, contributors bounce off within minutes. Do these first.   |
| **Highly Recommended (Strong)** | They materially increase retention and review throughput. Do these next. |
| **Optional (Nice-to-have)**     | Differentiate your project and create delight. Add as you scale.         |

---

# TIER 1 — MANDATORY CORE ADDITIONS

## 1.1 A `CONTRIBUTING.md` that actually gets a stranger to a running build

Not "fork and clone." A copy-pasteable path from zero to green tests, including the exact commands, the required toolchain versions, and the one env var people always forget.

**Concrete example (Node/Next.js project):**

```markdown
## Local setup

1. `nvm use` # uses .nvmrc (Node 20)
2. `npm ci` # reproducible install
3. `cp .env.example .env.local` # then set DATABASE_URL + KRAKEN_API_KEY (sandbox)
4. `npm run db:push` # create local schema
5. `npm run dev` # http://localhost:3000
6. `npm test` # must be green before you open a PR

## Claiming work

- Pick an issue labeled `good first issue`.
- Comment "I'd like to take this" → a maintainer assigns you (avoids duplicates).
```

**Benefit — contributor:** Eliminates "it builds on my machine" friction; first PR lands in under an hour.
**Benefit — maintainer:** Near-zero "how do I run this?" issues; PRs arrive already tested.

## 1.2 A real `LICENSE` file (not just a README mention)

State the license explicitly so contributions are legally accepted. For libraries prefer permissive (MIT/Apache-2.0); for copyleft needs use GPL/AGPL.

**Concrete example:** `LICENSE` containing the full Apache-2.0 text with `Copyright 2026 The Kraken Trading Simulator Authors.`
**Benefit — contributor:** Knows how their code may be used and that it's welcomed.
**Benefit — maintainer:** Defensible ownership; clean provenance for corporate users' license scanners.

## 1.3 A `CODE_OF_CONDUCT.md` with a named enforcement contact

Use the Contributor Covenant; include _who_ to contact and _how_ reports are handled.

**Concrete example:** Contributor Covenant 2.1, with `codetibo@proton.me` and a 48-hour response commitment.
**Benefit — contributor:** Signals a safe, welcoming space — especially important for underrepresented first-timers.
**Benefit — maintainer:** A documented off-ramp for bad actors; protects the community and your reputation.

## 1.4 Issue + PR templates that extract the info you need

Stop free-text issues. Templates standardize repro, environment, and scope.

**Concrete example — bug issue template:**

```markdown
### Expected

### Actual

### Steps to reproduce

1.

### Environment

- OS / browser / node version:
- Commit or tag:

### Screenshots / logs
```

**PR template** includes a checklist: "tests added?", "docs updated?", "linked issue?", "self-reviewed?".
**Benefit — contributor:** Never unsure what to include; faster, friendlier reviews.
**Benefit — maintainer:** Triage in seconds; fewer round-trips asking for basics.

## 1.5 A working, automated CI that runs on every PR

Lint + typecheck + test + build must go green automatically, and the checks must be _visible_ on the PR.

**Concrete example (GitHub Actions):**

```yaml
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: npm }
      - run: npm ci
      - run: npm run lint && npm run typecheck && npm test && npm run build
```

**Benefit — contributor:** Instant, objective feedback; no public embarrassment from a broken PR.
**Benefit — maintainer:** Never manually runs a contributor's branch; only reviews logic, not syntax.

## 1.6 A "good first issue" + "help wanted" labeling system, curated weekly

Labels are a funnel. A contributor who can't find an easy entry point leaves.

**Concrete example:** Two labels — `good first issue` (small, well-scoped, mentored) and `help wanted` (bigger, owner needed). A pinned issue "Start here 👋" links to a filtered view: `is:issue is:open label:"good first issue"`.
**Benefit — contributor:** A clear, low-fear starting line.
**Benefit — maintainer:** A predictable inbound pipeline of scoped work.

## 1.7 A README "Contribute" section + a 10,000-ft project map

Tell people _what_ the project is and _where_ things live before they dig.

**Concrete example:**

```markdown
## Contributing

We love PRs! See [CONTRIBUTING.md](./CONTRIBUTING.md).
Good first issues: https://github.com/you/repo/labels/good%20first%20issue

## Project layout

- `app/` Next.js routes & UI
- `app/api/` backend route handlers
- `lib/engine/` the simulation/order-matching core (pure, fully tested)
- `prisma/` database schema
```

**Benefit — contributor:** Self-orients; picks the right file the first time.
**Benefit — maintainer:** Fewer "where do I add this?" questions.

---

# TIER 2 — HIGHLY RECOMMENDED STRONG ADDITIONS

## 2.1 `docs/ARCHITECTURE.md` (or `DEVELOPMENT.md`) with a data-flow diagram

Explain module boundaries, the core abstraction, and _why_ it's shaped that way.

**Concrete example:** A Mermaid sequence diagram showing `UI → /api/orders → engine.match() → db → websocket push`, plus a note: "The engine is pure and side-effect free so it's unit-testable without a DB."
**Benefit — contributor:** Makes _correct_ changes instead of _working_ changes; fewer architectural rejections.
**Benefit — maintainer:** Reviews focus on intent, not "you put this in the wrong layer."

## 2.2 A documented testing strategy + fixtures/seed data

Show how to write a test and give them data to test with.

**Concrete example:** `npm run test:watch`, a `tests/fixtures/orders.json`, and a `tests/seed.ts` that builds a fake portfolio. A `CONTRIBUTING.md` note: "Add a test next to the file as `*.test.ts`; aim for the existing ~85% coverage on new code."
**Benefit — contributor:** Confidence their change won't break others; clear quality bar.
**Benefit — maintainer:** Trusts merges; regressions caught pre-merge.

## 2.3 A community channel with a stated response norm (Discord/Matrix/Zulip)

Real-time help converts lurkers into contributors.

**Concrete example:** A `#contributors` Discord channel + a weekly 30-min "office hours" voice room; README states "Questions welcome, no judgment."
**Benefit — contributor:** Unblocks fast; feels belonging.
**Benefit — maintainer:** Builds a community that self-supports and surfaces future co-maintainers.

## 2.4 Automated dependency updates with a clear merge policy

Dependabot/Renovate PRs are perfect starter contributions and reduce maintainer toil.

**Concrete example:** Renovate config grouping patch updates into one weekly PR, with CI auto-merging if green and no major version bump.
**Benefit — contributor:** Easy, safe wins; learns your CI/review flow.
**Benefit — maintainer:** Security debt handled continuously, not in a panic.

## 2.5 A `CHANGELOG.md` following "Keep a Changelog" + SemVer policy

Let contributors see the impact of their work and users know what changed.

**Concrete example:**

```markdown
## [1.4.0] - 2026-07-01

### Added

- Risk-management panel (#212, thanks @newcontributor)

### Fixed

- Order book flicker on mobile (#198)
```

**Benefit — contributor:** Public credit; understands release cadence.
**Benefit — maintainer:** Clean release notes; users stop asking "what's new?"

## 2.6 Recognition: `CONTRIBUTORS.md` + all-contributors bot + release shout-outs

People contribute for intrinsic and reputational reasons; make reputation visible.

**Concrete example:** `all-contributors` CLI adds an emoji grid to README (`🐛 bug`, `💻 code`, `📖 docs`, `🤔 ideas`). Each release tweet/Discord post thanks first-time contributors by name.
**Benefit — contributor:** Tangible proof of work for resumes/conferences.
**Benefit — maintainer:** Retention skyrockets; contributors become advocates.

## 2.7 A public roadmap / milestone board

Show what's planned so contributors self-select aligned work instead of guessing.

**Concrete example:** GitHub Milestones "v1.5 — Backtesting" with issues grouped; a `ROADMAP.md` with quarterly themes.
**Benefit — contributor:** Picks work that matters and won't be rejected as "out of scope."
**Benefit — maintainer:** Steers the project without micromanaging.

## 2.8 A stated "Definition of Done" + kind review culture + review SLA

Set expectations: what "merged" means, and how fast they'll hear back.

**Concrete example:** In CONTRIBUTING: "We aim to give first feedback within 2 business days. We use GitHub _suggested changes_ and never say 'this is wrong' without a reason." DoD: tests pass, docs updated, linked issue closed.
**Benefit — contributor:** Predictable, respectful experience; learns from reviews.
**Benefit — maintainer:** Scales review load; contributors become reviewers.

## 2.9 Domain-specific contribution guidelines (security / a11y / i18n)

If relevant, tell experts exactly how to contribute in their specialty.

**Concrete example:** `SECURITY.md` with a private disclosure flow; `CONTRIBUTING.md` section "Adding a trading indicator" specifying the pure-function interface and required unit tests.
**Benefit — contributor (expert):** Knows their standards are respected and how to plug in.
**Benefit — maintainer:** High-quality, compliant contributions in risky areas.

---

# TIER 3 — OPTIONAL NICE-TO-HAVE ADDITIONS

## 3.1 GitHub Discussions / community forum

A searchable Q&A and idea space that doesn't pollute the issue tracker.
**Example:** Enable Discussions with categories "Q&A", "Ideas", "Show and tell."
**Benefit:** Reduces issue noise; builds a knowledge base.

## 3.2 Sponsored / bounty issues (Polar, Gitcoin, IssueHunt)

Incentivize specific hard tasks.
**Example:** A `$100 Polar` issue for "implement WebSocket reconnection with backoff."
**Benefit:** Attracts motivated contributors for painful work.

## 3.3 Event participation (Hacktoberfest, 24-pull-requests)

Seasonal spikes in contributors.
**Example:** Tag `hacktoberfest` issues; promise review within 72h during October.
**Benefit:** Burst of new contributors; some convert to long-term.

## 3.4 Video architecture tour / Loom walkthrough

A 10-minute screen recording of "how to add a feature."
**Example:** Loom linked in CONTRIBUTING showing a full PR from issue→test→merge.
**Benefit:** Visual learners onboard 2x faster.

## 3.5 `GOVERNANCE.md` + a path to maintainership

Show how a contributor becomes a committer.
**Example:** "After 5 merged PRs + 3 reviewed PRs, you may be invited to triage."
**Benefit:** Gives contributors a growth ladder; de-risks bus factor for maintainers.

## 3.6 Localized documentation

Translate README/CONTRIBUTING into 2–3 major languages.
**Example:** `CONTRIBUTING.zh-CN.md`, `README.es.md`.
**Benefit:** Opens non-English-speaking contributor pools.

## 3.7 Perf/fuzz benchmarks in CI

For libraries/engines, guard against regressions.
**Example:** `npm run bench` posts a delta comment on PRs touching `lib/engine`.
**Benefit:** Experts can optimize confidently; maintainers catch slowdowns.

## 3.8 Docs site (Docusaurus/VitePress)

For larger projects, separate tutorial/reference from README.
**Example:** `docs.yourproject.dev` with "Getting started", "Core concepts", "API".
**Benefit:** Scales documentation; improves first-timer success.

---

# TAILORING BY CONTRIBUTOR SEGMENT

## A. First-time OSS contributors

**What they fear:** Breaking something, asking "dumb" questions, not knowing git.
**Must-haves:** `good first issue` labels (1.6), copy-paste setup (1.1), friendly CoC (1.3), mentorship channel (2.3), kind reviews (2.8).
**Tailor:** Write issues as tiny tutorials ("change this one line in `X` to fix the typo"). Add a "no question too small" norm. Pair via screen-share in office hours. Celebrate the _first_ merged PR loudly (2.6).

## B. Experienced OSS developers

**What they want:** Autonomy, clear architecture, fast, respectful review, impact.
**Must-haves:** Architecture doc (2.1), roadmap (2.7), CI (1.5), DoD + review SLA (2.8), path to maintainership (3.5).
**Tailor:** Let them self-assign `help wanted` issues. Invite to review others' PRs early. Use RFC/ADR process for bigger changes. Trust with merge rights after a track record.

## C. Domain-specific experts (e.g., trading/finance/ML/hardware)

**What they need:** A clear extension point and validation that their domain logic is correct.
**Must-haves:** Domain contribution guidelines (2.9), pure/testable core (2.1/2.2), benchmarks (3.7), recognition (2.6).
**Tailor:** Define explicit interfaces — e.g., "add an indicator by implementing `Indicator.compute(candles): number[]` with a unit test against known values." Provide a glossary and reference datasets. Have a domain expert co-review. Offer co-authorship on docs/whitepapers.

---

# QUICK START CHECKLIST (do in this order)

- [ ] `LICENSE` (1.2)
- [ ] `CODE_OF_CONDUCT.md` (1.3)
- [ ] `CONTRIBUTING.md` with exact setup + claim flow (1.1)
- [ ] Issue + PR templates (1.4)
- [ ] CI: lint + test + build on PR (1.5)
- [ ] `good first issue` / `help wanted` labels + pinned "Start here" (1.6)
- [ ] README Contribute section + layout map (1.7)
- [ ] `docs/ARCHITECTURE.md` + testing guide (2.1, 2.2)
- [ ] Community channel + office hours (2.3)
- [ ] Renovate/Dependabot (2.4)
- [ ] `CHANGELOG.md` + SemVer (2.5)
- [ ] Recognition bot + release thanks (2.6)
- [ ] Roadmap + DoD + review SLA (2.7, 2.8)
- [ ] Then layer on Tier 3 as the community grows.

> Principle: **Lower the cost of the first PR, raise the quality of the review, and make contribution visible.** Do those three things and voluntary contributors will come — and stay.
