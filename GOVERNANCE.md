# Governance

This document describes how the Kraken Trading Simulator project is governed and
how contributors can grow into maintainers. It exists so that the path from
"first PR" to "merge rights" is transparent and fair.

## Roles

| Role            | What they can do                                         | How you get there                                                |
| --------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| **Contributor** | Open issues/PRs, comment, review (non-binding)           | Anyone — open a PR!                                              |
| **Triager**     | Label/triage issues, close duplicates, answer questions  | Consistent, helpful participation for ~1 month                   |
| **Maintainer**  | Merge PRs, cut releases, manage CI/secrets, approve RFCs | Invited by existing maintainers after a track record (see below) |

## Becoming a maintainer

We follow a lightweight, merit-based ladder. There is no formal application —
maintainers nominate contributors they've seen consistently do the following:

1. **≥ 5 merged PRs** of reasonable quality (code, docs, tests, or infra).
2. **≥ 3 reviewed PRs** from others, with constructive, kind feedback.
3. **Reliable triage** — e.g., reproduced a bug, labeled issues, or answered a
   question in Discussions.
4. **Alignment with the [Code of Conduct](./CODE_OF_CONDUCT.md)** and project
   values (welcoming, teaching, pragmatic).

When these are met, an existing maintainer opens a private nomination. A simple
majority of current maintainers approves, and the new maintainer is added to the
GitHub team and thanked publicly in [`CHANGELOG.md`](./CHANGELOG.md).

## Decision making

- **Day-to-day changes** (bug fixes, small features): lazy consensus. Merge if
  CI is green and at least one maintainer approves.
- **Architectural changes** (new engine interfaces, API shape, data model): an
  RFC in `docs/rfcs/` is required. RFCs are approved by maintainer consensus.
- **Conflicts**: the maintaining team discusses; if stuck, the project founder
  has the deciding vote. We optimize for momentum and a welcoming community.

## RFC process

1. Copy `docs/rfcs/0000-template.md` to `docs/rfcs/NNNN-short-title.md`.
2. Open a PR. Discussion happens on the PR for ~5 business days.
3. A maintainer labels it `rfc: accepted` or `rfc: rejected` with a summary.

## Staying a maintainer

Maintainers who step away (life happens!) are moved to "Emeritus" and can return
any time. We never shame anyone for reduced availability.

## Changes to this document

This file is changed by RFC, like any other governance change.
