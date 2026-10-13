# Report format

The report follows this structure exactly. A section with no verifiable content says so explicitly instead of being filled with generalities.

## Statuses, severities, priorities

- **Status**: `OBSERVED`, `VERIFIED`, `INFERRED`, `POSSIBLE`, `UNVERIFIED`.
- **Severity**: `CRITICAL` (major compromise, realistic exploitability), `HIGH` (serious, fix quickly), `MEDIUM` (real but limited or conditional), `LOW` (low impact), `INFO` (observation). Never inflate.
- **CVSS 4.0** for every significant vulnerability: score + vector (AV, AC, AT, PR, UI, VC, VI, VA, SC, SI, SA). CVSS is not business priority.
- **Priority**: `P0` blocker (security, production, data corruption), `P1` fix very soon, `P2` significant debt, `P3` secondary quality. Weigh exploitability, blast radius, frequency, business criticality, fix cost, and regression risk.
- **No false positives**: do I have evidence? Is it reproducible? Actually exploitable? Does context reduce the risk? Is there already a mitigation? If unsure: `UNVERIFIED` + procedure.
- One root cause = one systemic finding + list of locations.

## Finding format

```markdown
### FINDING-XXX: <title>

| Field | Value |
|---|---|
| Category / Subcategory | |
| Severity | |
| CVSS 4.0 | score, vector (or N/A) |
| Priority | P0-P3 |
| Confidence | high / medium / low |
| Status | OBSERVED / VERIFIED / ... |
| Component | |
| Location | `file:line`, function |

**Description.** The problem, precisely.
**Evidence.** Code/config excerpt, command or test output (secrets redacted).
**Why it matters.** Concrete scenario.
**Exploit / failure scenario.** Realistic and non-destructive.
**Impact.** Confidentiality / Integrity / Availability / business / operational.
**Root cause.**
**Remediation.** Recommended fix, alternative when relevant.
**Verification.** How to prove it is fixed (test, command).
```

For a performance finding, replace CVSS with: current measurement, target, evidence, cause, impact, fix, expected gain, verification.

For an important fix, add BEFORE / AFTER / WHY / TEST, only when useful.

## Report structure

1. **Executive summary**: overall technical state, architectural strengths, main risks (security, performance, reliability, debt). Nothing unproven.
2. **System architecture**: desktop (React + Tauri/Rust), mobile (Expo), web, API, DB/Redis/S3, plugins (VS Code, Figma, Notion), external services + ASCII diagram.
3. **Trust boundaries**: trust model and matrix:

   | Boundary | Source | Destination | Data | Authn | Authz | Validation | Encryption | Main risks |
   |---|---|---|---|---|---|---|---|---|

4. **Technology inventory**: versions actually detected (lockfiles).
5. **Security summary**: `| ID | Severity | Category | Finding | Evidence | Component | Fix |`
6. **Performance summary**: `| ID | Area | Measurement | Problem | Impact | Recommendation |`
7. **Reliability summary**.
8. **Architecture & code quality**: coupling, cohesion, maintainability, debt. Component matrix:

   | Component | Technology | Exposure | Privileges | Data sensitivity | Complexity | Risk |
   |---|---|---|---|---|---|---|

9. **Dependency & supply chain**: vulnerabilities (direct/transitive, reachability), outdated packages, licenses, abandoned packages, CI risks.
10. **Testing**: coverage, quality, gaps, security, E2E, performance.
11. **Observability**: logs, metrics, traces, alerting, error tracking.
12. **Accessibility**: relevant WCAG 2.2 results.
13. **OWASP**: Top 10 2025 (A01-A10) and API Top 10 2023 (API1-API10), each `PASS` / `PARTIAL` / `FAIL` / `NOT APPLICABLE` / `UNVERIFIED` with justification.
14. **Threat model** (STRIDE): assets, actors, surfaces, main threats.
15. **Detailed findings**: all of them, minor ones included.
16. **Root causes**: cause → findings grouping.
17. **Quick wins**: < 30 min, < 2 h, < 1 day.
18. **Remediation roadmap**: 0-24 h, 1-7 days, 1-4 weeks, 1-3 months.
19. **Recommended architecture**: incremental target, keep what is good, no rewrite.
20. **CI/CD security baseline**: lint, typecheck, tests, scans (deps, secrets, SAST), build, signing, provenance, release.
21. **Security baseline**: minimum for production.
22. **Performance baseline**: justified numeric targets (startup, idle memory, tracker CPU, API p95...).
23. **Unknown / Unverified** (mandatory): external infra, production secrets, real traffic, real DB size, third-party cloud config, signing environment, etc.
24. **Scorecard**: indicative (Security, Architecture, Performance, Reliability, Maintainability, Testing, Observability, DevOps, Supply chain, Accessibility), only if data is sufficient, with the scale and a note that it is an internal indicator, not a certification.
25. **Final technical verdict**: current maturity, main blocker, biggest security risk, biggest performance bottleneck, biggest architectural issue, biggest reliability risk, most important immediate action, most important medium-term action. Always technically justified.
26. **Production readiness**: explicit answers, with finding IDs, to: safe to distribute? what blocks production? account compromise? local machine compromise? cloud compromise? data loss? severe degradation? outages? update compromise? privilege escalation?
27. **Patch plan**: per fix, finding ID, file, current behavior, target, change, side effects, required test, rollback. No changes applied.
28. **Final action list**: concrete numbered actions (Fix / Add / Remove / Restrict / Test / Monitor / Document), each linked to a finding.

The report must let a senior developer know where the problems are, why they exist, how serious they are, how to reproduce, fix, and verify them, and what to do first.
