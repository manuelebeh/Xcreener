# Contributing

## Licensing

SnapGlow uses two licenses. See [License](README.md#license) for which directories use which.

Before your first pull request is merged, you must sign the [Contributor License Agreement](CLA.md). It lets the maintainer keep publishing SnapGlow on app stores, whose terms conflict with the AGPL, and offer commercial licenses next to the AGPL. You keep the copyright on your work. To sign, comment on your pull request:

> I have read the CLA Document and I hereby sign the CLA

The SnapGlow name and logo are not covered by the code licenses: see [TRADEMARKS.md](TRADEMARKS.md).

## Workflow

1. Set up the repo with the steps in the [README](README.md#getting-started), then run `mise run install-hooks`.
2. Keep pull requests small and focused on one change.
3. Follow [`AGENTS.md`](AGENTS.md) for code style and the architecture rules of the app you touch.
4. Write commits in [Conventional Commits](https://www.conventionalcommits.org/) format. The commit-msg hook checks it.
5. Run `mise run lint`, `mise run typecheck` and `mise run test` before opening the pull request.

## Security issues

Do not open a public issue for a vulnerability. Use [GitHub private vulnerability reporting](../../security/advisories/new) or write to hello@emmanuelebeh.dev instead.
