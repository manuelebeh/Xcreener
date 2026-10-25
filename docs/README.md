# SnapGlow docs

Everything here is tracked in git. Strategy, audits and marketing notes live in `docs/internal/`, which is gitignored and stays on your machine.

| Folder | What it holds |
|--------|---------------|
| [`architecture/`](architecture/) | [Desktop stack](architecture/desktop-stack.md) and the [ADRs](architecture/adr/README.md) (one decision per file) |
| [`guides/`](guides/) | How-tos: [desktop builds](guides/desktop-builds.md), [release signing](guides/release-signing.md), [mobile signing](guides/release-signing-mobile.md), [Auth0 setup](guides/auth0-setup.md) |
| [`quality/`](quality/) | [Accessibility audit](quality/accessibility-audit.md) of the design system |

## Where to put a new doc

- A technical decision with trade-offs: new ADR in `architecture/adr/`, next number, same template as the others.
- Steps someone has to run (setup, release, credentials): `guides/`.
- What shipped when: `product/`.
- Test or audit results about the shipped code that carry no exploitable detail: `quality/`.
- Requirements, pricing, KPIs, security findings, competitor and market research, SEO plans: `internal/` (never committed).

`docs/internal/` layout, for reference: `audits/` (platform and security audits, written by the `platform-audit` skill), `strategy/`, `marketing/`, `product/requirements.md`, plus the original `Cahier des Charges.md`.

Also see [`AGENTS.md`](../AGENTS.md) for agent rules, [`design.md`](../design.md) for the visual system, and [`.cursor/rules/`](../.cursor/rules/) for per-app architecture rules.
