---
paths:
  - "apps/desktop/src/**/*.{ts,tsx}"
---

# Desktop Architecture - Modules / App / Shared

The SnapGlow desktop frontend uses a **module-first** architecture: domain modules, an app shell, shared types, Tauri IPC wrappers, and local SQLite.

## Directory Structure

```
src/
├── app/                    # Application shell
│   ├── App.tsx             # Root layout + router
│   ├── routes.tsx          # React Router routes
│   └── providers/          # Bootstrap (DB init, etc.)
├── modules/                # Domain modules
│   ├── capture/            # Screen capture orchestration
│   ├── editor/             # Canvas / beautify UI
│   ├── export/             # Export formats & flow (Sprint 1.5)
│   ├── history/            # Capture history grid & reopen (Sprint 1.6)
│   ├── redaction/          # Sensitive-data scan & masking (Sprint 1.5)
│   └── settings/           # User preferences UI
├── shared/                 # Cross-cutting TypeScript only
│   └── types/              # IPC payloads, settings types
├── tauri/                  # Tauri IPC layer
│   ├── commands.ts         # Typed invoke() wrappers
│   └── events.ts           # Event listeners
├── db/                     # SQLite (@tauri-apps/plugin-sql)
│   ├── index.ts            # initDatabase, getSetting, setSetting, loadAppSettings
│   ├── captures.ts         # Capture history CRUD + prune (Sprint 1.6)
│   ├── migrate.ts          # Multi-statement migration runner
│   ├── connection.ts       # Shared DB connection
│   └── migrations/         # SQL migrations
├── styles/
│   └── global.css
└── main.tsx                # Entry point
```

Rust commands live in `src-tauri/src/commands/` (`capture`, `redaction`, `export`, `storage`). Export file I/O is frontend-only (Sprint 1.5); `export_image` remains a stub.

## Rules

### Module boundaries
- Each module lives under `modules/<name>/` with a public `index.ts` barrel
- Typical layout: `store.ts`, `components/`, `hooks/`, `utils/`
- Modules import from `@/shared/`, `@/db/`, `@/tauri/` - not from sibling modules
- If two modules need shared code, extract to `shared/` or a workspace package

### App layer
- `app/routes.tsx` defines React Router routes only
- `app/providers/` handles one-time bootstrap (e.g. `initDatabase()`)
- No business logic in `App.tsx` - layout and navigation only

### State & data
- **Zustand** per module (`store.ts`) - not React Context (except providers)
- **SQLite** via `@/db` for local persistence (settings, custom presets, capture history)
- Rust IPC via `@/tauri/commands.ts`; mirror types in `@/shared/types/ipc.ts`

### Import conventions
- Always use the `@/` alias: `import { getSetting } from '@/db'`
- Module-internal imports use relative paths
- Export a module's public API via `index.ts` - avoid deep imports from consumers

### Component guidelines
- Functional components only
- Co-locate component-specific types with the component
- Biome for lint/format - no ESLint/Prettier
- UI polish: use the Hallmark skill when building new surfaces
