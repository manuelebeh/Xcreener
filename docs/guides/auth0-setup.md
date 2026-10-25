# Auth0 setup the API depends on

The API reads identity claims from the **access token**, not the ID token. Two tenant settings have to match the code.

## Post-login Action: email claims

`apps/api/src/plugins/auth.ts` and `plugins/collab-ws.ts` only keep `email` when `email_verified === true`. Workspace invitations sent to an address compare against that email, so without the claim every email invitation returns 403 ("Email does not match invitation"). Link invitations (no email) keep working.

Add both claims in the post-login Action:

```js
exports.onExecutePostLogin = async (event, api) => {
  api.accessToken.setCustomClaim('email', event.user.email);
  api.accessToken.setCustomClaim('email_verified', event.user.email_verified === true);
};
```

Deploy the Action before the API version that requires `email_verified` (FINDING-022 of the 2026-10-24 audit).

## Management API (machine-to-machine)

`AUTH0_MANAGEMENT_CLIENT_ID` / `AUTH0_MANAGEMENT_CLIENT_SECRET` are optional. When set, the M2M application needs these scopes on the Auth0 Management API:

| Scope | Used by |
|---|---|
| `create:organizations` | `POST /v1/workspaces/:id/sso/enable` |
| `delete:users` | `DELETE /v1/users/me` (account deletion also removes the Auth0 identity) |

Without the secrets, account deletion still erases Xcreener data and answers `identityDeleted: false`; the person can sign in again and gets an empty account.
