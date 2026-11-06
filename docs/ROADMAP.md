# Finance System — Roadmap

> Living reference for this project. Update the checkboxes as we go.
> Saved in the repo as `docs/ROADMAP.md`.

## Context

**Today:** The app (FastAPI + Postgres + React/Vite, run with Docker Compose) runs on my Mac only.
Each day I spend money on non-daily things (car fuel, clothes, digital items…), I write a messy
note on my Android phone. About every two weeks I type those notes into the app by hand. This is slow,
and I forget some entries.

**Goal:**
1. Log a spend from the phone in **under 10 seconds**, with no paid hosting.
2. Make the app **cleaner and more robust** (safe data, valid data, tests).
3. Make it **a little smarter** with simple rules, no AI for now.

**Rules we follow**
- Use mature packages, don't build from scratch (list them in each phase).
- One phase at a time. Each phase ends with a commit and a short check.
- No AI / LLM in this roadmap.

---

## Phase 0 — Safety first (small)

Why: There are 11 uncommitted files and **no database backup**. One broken Docker volume could lose all the data.

- [x] Commit the current uncommitted work (crud, main, models, schemas, LogPage, MonthlyPage…).
- [x] Add a `backup` service to `docker-compose.yml` that takes a daily `pg_dump` into `./backups/`
      and keeps 7 daily + 4 weekly + 6 monthly copies.
      - Package: **`prodrigestivill/postgres-backup-local`** Docker image (mature, has rotation built in).
      - Add `backups/` to `.gitignore`.
- [x] Write a short "Restore a backup" section in the README (one `psql` command).
- [x] Fix the date bug: `todayString()` in `src/components/TransactionForm.jsx` uses
      `toISOString()` (UTC). Between 00:00 and 01:00 in Tunisia it gives **yesterday**. Use the local date.
      (Also fixed in `DebtLedgerPanel.jsx` and `isOverdue` in `calc.js`; shared helper `src/lib/dates.js`.)

**Done when:** a dump file appears in `backups/`, and a test restore into a temp DB works.

✅ **Phase 0 done (2026-11-06).** Restore test: same row counts and totals as the live DB.

---

## Phase 1 — Foundation: clean and valid data

Why: The quick-add feature needs categories on the backend and a safe way to add new tables.

- [x] **Alembic** for schema changes.
      - Make a baseline migration from the current models (`backend/app/models.py`).
      - Remove the raw `ALTER TABLE` calls and `create_all` from `lifespan` in `backend/app/main.py`.
      - Run `alembic upgrade head` when the API container starts.
- [x] **Money as `Numeric(12, 3)`** instead of `Float` (TND has 3 decimals), for
      `Transaction.amount`, `Debt.amount`, `MonthlyFund.*`, `AppSettings.salary`, `cash_balance_offset`.
- [x] **Validation** in `backend/app/schemas.py`:
      - `date: datetime.date`, `type: Literal["income","expense"]`, `currency: Literal["TND","EUR"]`,
        `paymentMethod: Literal["cash","bank","card"]`, `amount > 0`, `category` must be a known key.
- [x] **Categories on the backend**: move the list from `src/constants.js` to `backend/app/categories.py`
      and add `GET /categories`. The frontend reads it from there (keep the labels `ar` / `en`).
- [x] Remove the `except Exception` in `GET /settings` (it hides real errors).
- [x] `saveSettings` in `src/services/storage.js`: send only the changed fields (no GET first).
- [x] Fix the 5 existing ESLint errors (`react-hooks/set-state-in-effect` in TransactionForm and the 4 pages),
      so `npm run lint` is clean.
- [x] **Tests**: `pytest` + FastAPI `TestClient` for the main endpoints, run against a test Postgres.

Packages: `alembic`, `pytest`, `httpx` (needed by TestClient).

**Done when:** `pytest` passes, old data still loads, and bad input returns HTTP 422.

✅ **Phase 1 done (2026-11-06).** 36 backend tests pass (throwaway Postgres via testcontainers),
ESLint is clean, and the real database was migrated with identical counts and totals.
Notes: migrations run on API start (`app/migrate.py`); a local Homebrew Postgres on port 5432
shadows the Docker one (see README).

---

## Phase 2 — Quick add and note import (the main win)

Why: Turn "write a note, type it again later" into "type once, done".

### 2.1 Quick-add box
- One text box at the top of the Log page: `gas 60`, `chemise 45 yesterday`, `netflix 12€ 3/11`.
- Backend `POST /quick-add/parse` → returns **draft** transactions (not saved yet).
- The user checks the draft (category, amount, date) and clicks Save.

### 2.2 Paste a whole note (bulk import)
- A "Paste notes" dialog: paste the messy phone note → one draft row per line → edit in a table → Save all.
- Lines that can't be read are shown in red, not dropped.

### 2.3 Parser rules (no AI)
| Part | Rule |
|---|---|
| Amount | First number in the line (`60`, `45.500`, `45,5`) |
| Currency | `€` / `eur` → EUR + card. Default TND |
| Date | `today`, `yesterday`, `اليوم`, `أمس`, `hier`, `3/11`, `03-11-2026`. Default today |
| Category | Keyword table (see 2.4), then fuzzy match for typos (`essance` → car) |
| Notes | The remaining words |
| Type | Expense by default. `+` or words like `salary`, `راتب` → income |

- Reuse the Arabic normalization from `normalizeSearchText` in `src/pages/LogPage.jsx`
  (أإآ→ا, ة→ه, ى→ي). Put a Python copy in the parser.

### 2.4 It learns (simple "intelligence")
- New table `category_rules (keyword, category, hits)`. Start with seed words:
  `gas, essence, بنزين, carburant → car`; `chemise, pantalon, ملابس → clothes`; …
- When I save a draft and **change** its category, store the note words → new category.
- When rules disagree, the rule with the most `hits` wins.
- Small "Rules" list in Settings to see and delete rules.

Packages:
- **`dateparser`** (BSD) — dates in Arabic, French and English.
- **`rapidfuzz`** (MIT) — fast fuzzy matching for typos.
- Keyword table: own code (too specific to my categories for a package).

**Done when:** pasting my real 2-week note fills ≥ 80 % of rows with the right category and no wrong amounts.
Parser has unit tests with real note lines.

---

## Phase 3 — Use it from my Android phone (free)

Why: Log the spend right when it happens, from anywhere.

### 3.1 Private network with Tailscale (free personal plan)
- Install Tailscale on the Mac and on the Android phone (same account).
- Run `tailscale serve --bg 8080` on the Mac → the app is at
  `https://<mac-name>.<tailnet>.ts.net` with a real HTTPS certificate.
- Nothing is public on the internet. Only my devices can open it.
- Start the web container too (`npm run docker:full`), and set Docker Desktop to start at login.

### 3.2 Install as an app (PWA)
- Add a manifest + icons + service worker so Chrome shows **"Install app"**.
- Add a home-screen shortcut **"Add expense"** that opens the quick-add box directly.
- Mobile layout check for the quick-add box (big input, big Save button).

### 3.3 Works when the Mac is off (offline queue)
- If the server can't be reached, the phone keeps the entry and sends it later automatically.
- Show a small "3 waiting to sync" badge.
- Server side: saving the same transaction `id` twice must not create a duplicate (upsert already does this — keep it).

Packages:
- **`vite-plugin-pwa`** (MIT) — manifest + service worker.
- **Workbox Background Sync** (comes with vite-plugin-pwa) — retries failed POSTs when online.

**Done when:** with the Mac **off**, I add an expense on the phone; when the Mac is back on, it appears in the app.

---

## Phase 4 — Smarter app (rules, no AI)

Pick from this list after Phase 3, one at a time:
- [ ] **Duplicate warning**: same amount + same day + same category → "Already logged?".
- [ ] **Monthly budget per category** with a warning at 80 % and 100 %.
- [ ] **Unusual spend**: amount much higher than my average for that category.
- [ ] **Recurring suggestions**: same amount around the same day for 3 months → suggest "mark as recurring".
- [ ] **"Not logged recently" reminder**: no entry for 3 days → banner on the dashboard.

---

## Later / nice to have
- [ ] Simple PIN login if the app is ever used outside Tailscale.
- [ ] CSV export (for backup or a spreadsheet).
- [ ] Import from the old CSV in `to_be_ignored/` with the same bulk-import screen.
- [ ] Move business logic from `src/lib/calc.js` to the backend if the phone becomes slow.

---

## Verification (for every phase)
1. `docker compose --profile full up -d --build` starts with no errors; `GET /api/health` → `ok`.
2. Backend: `pytest` passes. Frontend: `npm run lint` and `node --test src/lib/*.test.mjs` pass.
3. Manual check in the browser: add, edit and delete a transaction; dashboard totals still match.
4. Phase 3 only: test on the real Android phone, online and with the Mac off.

## Progress log
| Date | Phase | What changed |
|---|---|---|
| 2026-11-06 | — | Roadmap created |
| 2026-11-06 | 0 | Committed pending work, daily DB backup + restore docs, local-date fix |
| 2026-11-06 | 0 | README screenshots replaced with fake demo data (`scripts/seed_demo.py`), old ones purged from git history |
| 2026-11-06 | 1 | Alembic, NUMERIC money, input validation, `GET /categories`, small fixes, clean lint, pytest suite |

---

## Next step
Start Phase 2 (quick add and note import).
