# Mobile release & signing (Sprint 1b.3)

Operational guide for Xcreener iOS + Android builds via [EAS Build](https://docs.expo.dev/build/introduction/).

## Prerequisites

| Requirement | Status (Sprint 1b.3) |
|-------------|----------------------|
| [Expo account](https://expo.dev/signup) | Required for EAS |
| Apple Developer Program ($99/yr) | **Not yet** — blocks TestFlight |
| Google Play Console ($25 one-time) | **Not yet** — blocks Play Internal |
| `EXPO_TOKEN` CI secret | Document only until CI enabled |

## Local setup

```bash
cd apps/mobile
npm install -g eas-cli   # or: npx eas-cli
eas login
eas init                 # replaces placeholder projectId in app.config.ts extra.eas
```

## Build profiles (`eas.json`)

| Profile | Use | dev-client | Distribution |
|---------|-----|------------|--------------|
| `development` | Daily dev + device testing | Yes | Internal (simulator OK on iOS) |
| `preview` | QA / internal testers | No | Internal APK/IPA |
| `production` | Store submission | No | App Store / Play (AAB) |

```bash
cd apps/mobile
eas build --profile preview --platform ios
eas build --profile preview --platform android
eas build --profile production --platform all
```

`APP_VARIANT=production` omits `expo-dev-client` from native build (see `app.config.ts`).

## Credentials

EAS manages credentials by default:

```bash
eas credentials
```

### iOS

- Distribution certificate + provisioning profile (EAS or manual upload)
- App ID: `com.xcreener.app`
- Capabilities: Photos (write), Share Extension (via `expo-share-intent`)

### Android

- Keystore: EAS-generated or upload existing
- Package: `com.xcreener.app`
- Play App Signing recommended when Play Console is active

## Store upload (after accounts active)

```bash
# After preview/production build succeeds
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

Update placeholder values in `eas.json` → `submit.production`:

- `appleId`, `ascAppId`, `appleTeamId`
- `google-play-service-account.json` (Play API service account)

## Privacy & data safety

Disclose in store forms:

| Data | Collected | Shared | Purpose |
|------|-----------|--------|---------|
| Photos | Write only (user export) | No | Save edited screenshots |
| Share import | Read incoming image | No | User-initiated edit |
| OCR / redaction | On-device only | No | Sensitive data detection |
| Account (email, via Auth0) | Only when the user signs in | No | Plan check (watermark on free plans) |
| Analytics | None in mobile MVP | No | — |

Privacy policy URL: **TBD** before public submission (required by both stores).

## Account & paid plan

The mobile app reuses the desktop's Auth0 native application (callback `xcreener://auth/callback`) and checks the plan token from `GET /v1/me/entitlement` with `@xcreener/team-core/entitlement`. Free plans (or a missing public key) get the Xcreener watermark on the preview and every export.

EAS builds run on Expo's servers, so GitHub Actions variables do not reach them. Set these per environment as plain-text EAS variables (they are public and ship in the bundle):

```bash
cd apps/mobile
for name in EXPO_PUBLIC_API_URL EXPO_PUBLIC_AUTH0_DOMAIN EXPO_PUBLIC_AUTH0_CLIENT_ID \
  EXPO_PUBLIC_AUTH0_AUDIENCE EXPO_PUBLIC_ENTITLEMENT_PUBLIC_KEY; do
  npx eas-cli env:create --environment production --visibility plaintext --name "$name" --value "…"
done
```

`EXPO_PUBLIC_ENTITLEMENT_PUBLIC_KEY` is the same value as the desktop's `XCREENER_ENTITLEMENT_PUBLIC_KEY` (see [release-signing.md § 7](./release-signing.md#7-paid-plan-entitlements-ed25519)). Local dev: copy `apps/mobile/.env.example` to `.env.local`.

## Related

- [listing-checklist.md](../../apps/mobile/docs/store/listing-checklist.md) — screenshots, copy, assets
- [device-matrix.md](../../apps/mobile/docs/qa/device-matrix.md) — QA matrix
- Desktop signing: [release-signing.md](./release-signing.md)
