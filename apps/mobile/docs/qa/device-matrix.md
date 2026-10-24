# Mobile device QA matrix (Sprint 1b.3)

Manual QA on real devices. Fill status as testing progresses.

## Target devices

| Device | OS | Tester | Date | Status |
|--------|-----|--------|------|--------|
| iPhone 14+ | iOS 17+ | — | — | Pending |
| Pixel 7+ | Android 13+ | — | — | Pending |
| Galaxy S23+ | Android 13+ / One UI | — | — | Pending |

## Scenarios

Each device must pass all rows.

| ID | Scenario | iPhone | Pixel | Galaxy | Notes |
|----|----------|--------|-------|--------|-------|
| S1 | Share image from Photos/Gallery → `/import` preview | — | — | — | |
| S2 | Continue to `/editor` — beautify renders | — | — | — | |
| S3 | Preset picker — social + ratio presets | — | — | — | |
| S4 | Style bar — padding, radius, shadow, background | — | — | — | |
| S5 | Annotations — text, rect, ellipse, highlight, manual blur | — | — | — | |
| S6 | Redaction scan — detections overlay visible | — | — | — | On-device OCR |
| S7 | Mask one detection (tap overlay) | — | — | — | |
| S8 | Mask all | — | — | — | |
| S9 | Auto-redact toggle persists after restart | — | — | — | AsyncStorage |
| S10 | Export full-res → Save to Photos | — | — | — | Verify dimensions in Photos |
| S11 | Export → Share sheet | — | — | — | |
| S12 | Dark mode + light mode | — | — | — | |
| S13 | Large image (4K+) — no crash, acceptable latency | — | — | — | See perf notes |

**Legend:** Pass / Fail / Pending / N/A

## Performance notes (M1-011)

Record after testing on real devices:

| Metric | iPhone | Pixel | Galaxy | Target |
|--------|--------|-------|--------|--------|
| OCR scan (1080p screenshot) | — | — | — | < 3s |
| OCR scan (4K screenshot) | — | — | — | < 8s |
| Full-res export | — | — | — | < 5s |
| Editor open (import → editor) | — | — | — | < 2s |

**Optimizations shipped in 1b.3**

- OCR input downscaled to max 2048px longest edge (native module)
- Export uses offscreen `ExportCanvas` at layout full resolution (not preview scale)
- Skia snapshot encoded once to file (base64 → `documentDirectory`)

## Build under test

| Platform | Build profile | Version | Build ID / link |
|----------|---------------|---------|-----------------|
| iOS | preview / development | 0.1.0 | — |
| Android | preview / development | 0.1.0 | — |

> TestFlight + Play Internal uploads blocked until Apple Developer + Google Play accounts are active (see [release-signing-mobile.md](../../../docs/guides/release-signing-mobile.md)).
