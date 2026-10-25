# App Store & Google Play listing checklist

Complete before submission (Sprint 1b.4). Upload blocked until developer accounts are active.

## App metadata

| Field | iOS (App Store Connect) | Android (Play Console) | Draft value |
|-------|-------------------------|------------------------|-------------|
| App name | ✓ | ✓ | Xcreener |
| Subtitle / short description | ✓ | ✓ | Beautify screenshots instantly |
| Full description | ✓ | ✓ | TBD |
| Category | Photo & Video | Photography | |
| Content rating | Questionnaire | IARC questionnaire | |
| Privacy policy URL | Required | Required | TBD |
| Support URL | Required | Optional | TBD |

## Visual assets

| Asset | iOS | Android |
|-------|-----|---------|
| App icon 1024×1024 | ✓ | ✓ (via adaptive icon) |
| iPhone 6.7" screenshots (min 3) | ✓ | — |
| iPhone 6.5" screenshots | ✓ | — |
| Phone screenshots (min 2) | — | ✓ |
| Feature graphic 1024×500 | — | ✓ |
| Promo video | Optional | Optional |

Screenshot scenes to capture:

1. Import via share sheet
2. Editor with preset + beautify
3. Redaction scan with detection overlay
4. Export / share

## Permissions justification

| Permission | Platform | User-facing string | Review note |
|------------|----------|-------------------|-------------|
| Photo library (add) | iOS | Save edited screenshots | Write-only |
| Photo library | iOS | Same | No read of full library |
| Media / storage | Android | Save exports | Scoped storage |
| Share intent | Both | User shares image into app | No background access |

## Data safety (Google Play)

- No data collected for analytics
- No data shared with third parties
- OCR runs on-device; no text sent to servers
- Photos: processed locally; saved only when user taps Save

## App Privacy (Apple)

- Data not collected (or declare Photos as user-provided, not linked, on-device processing only)
- No tracking

## Pre-submit commands

```bash
cd apps/mobile
eas build --profile production --platform all
eas submit --profile production --platform ios    # after Apple account
eas submit --profile production --platform android
```

## Blockers (Sprint 1b.3)

- [ ] Apple Developer account
- [ ] Google Play Console account
- [ ] Privacy policy URL hosted
- [ ] EAS project ID (`eas init`)
- [ ] Store screenshots captured on real devices
