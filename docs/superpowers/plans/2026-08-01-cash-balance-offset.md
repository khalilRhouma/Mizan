# Cash Balance Offset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users set the true home-cash balance inline; persist a settings offset so later cash activity still moves the number.

**Architecture:** Store `cashBalanceOffset` in app settings. Displayed balance = `(withdrawals − cash TND expenses) + offset`. Inline edit on the balance amount computes `offset = target − rawBalance` and PATCHes settings.

**Tech Stack:** FastAPI + SQLAlchemy settings row; React monthly page + `HomeCashPanel`; pure calc in `src/lib/calc.js`. Verify calc with Node’s built-in test runner (no new deps).

## Global Constraints

- Offset default is `0`; missing column/field must behave as `0`.
- Balance remains all-time; withdrawn/spent stay month-scoped and read-only.
- Existing Postgres/SQLite DBs need an ensure-column on startup (`create_all` alone is not enough).
- Do not add adjustment history or a settings-page editor.

## File map

| File | Responsibility |
|------|----------------|
| `backend/app/models.py` | `cash_balance_offset` column on `AppSettings` |
| `backend/app/schemas.py` | `cashBalanceOffset` on SettingsIn/Out |
| `backend/app/crud.py` | Read/write offset in get/patch settings |
| `backend/app/main.py` | Ensure column exists at startup |
| `src/services/storage.js` | Default `cashBalanceOffset: 0` |
| `src/lib/calc.js` | Accept offset in balance helpers |
| `src/lib/calc.cashBalance.test.mjs` | Node tests for offset math |
| `src/components/HomeCashPanel.jsx` | Inline edit UI |
| `src/pages/MonthlyPage.jsx` | Load offset, pass into summary + save handler |
| `src/i18n.js` | Optional short edit hint (only if needed) |

---

### Task 1: Backend settings field + ensure column

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/crud.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: `SettingsOut.cashBalanceOffset: float`, `SettingsIn.cashBalanceOffset: float | None`, column `AppSettings.cash_balance_offset`

- [ ] **Step 1: Add model column**

In `AppSettings`, after `fund_splits_investment`:

```python
cash_balance_offset: Mapped[float] = mapped_column(Float, default=0)
```

- [ ] **Step 2: Update schemas**

```python
class SettingsIn(BaseModel):
    language: str | None = None
    theme: str | None = None
    salary: float | None = None
    fundSplits: FundSplits | None = None
    cashBalanceOffset: float | None = None


class SettingsOut(BaseModel):
    language: str
    theme: str
    salary: float
    fundSplits: FundSplits
    cashBalanceOffset: float = 0
```

- [ ] **Step 3: Update DEFAULT_SETTINGS and get/patch in crud.py**

```python
DEFAULT_SETTINGS = SettingsOut(
    language="ar",
    theme="light",
    salary=0,
    fundSplits=FundSplits(),
    cashBalanceOffset=0,
)
```

In `get_settings`, include:

```python
cashBalanceOffset=getattr(row, "cash_balance_offset", 0) or 0,
```

In `patch_settings`, after salary merge:

```python
if patch.cashBalanceOffset is not None:
    merged["cashBalanceOffset"] = patch.cashBalanceOffset
# ...
row.cash_balance_offset = merged["cashBalanceOffset"]
```

Ensure `merged` always has `cashBalanceOffset` from `current.model_dump()`.

- [ ] **Step 4: Ensure column on startup in main.py lifespan**

After `Base.metadata.create_all(bind=engine)`:

```python
with engine.begin() as conn:
    conn.execute(
        text(
            "ALTER TABLE settings ADD COLUMN IF NOT EXISTS "
            "cash_balance_offset DOUBLE PRECISION DEFAULT 0"
        )
    )
```

(Use dialect-appropriate type if SQLite is used in tests; for this project’s Postgres Docker setup, `DOUBLE PRECISION` is fine. If the app also runs SQLite locally, use a try/except around ALTER or detect dialect.)

Check `backend/app/config.py` / compose for DB engine; match that.

- [ ] **Step 5: Smoke-check API**

Restart API if running. `GET /api/settings` (or `/settings`) should include `"cashBalanceOffset": 0`. PATCH with `{"cashBalanceOffset": 12.5}` and GET again to confirm.

- [ ] **Step 6: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py backend/app/crud.py backend/app/main.py
git commit -m "feat: persist cashBalanceOffset in settings"
```

---

### Task 2: Calc helpers + Node tests

**Files:**
- Modify: `src/lib/calc.js`
- Create: `src/lib/calc.cashBalance.test.mjs`

**Interfaces:**
- Consumes: existing transaction shapes
- Produces:
  - `cashBalanceAllTime(transactions, beforeMonth?, offset = 0) → number`
  - `homeCashSummary(transactions, yearMonth, offset = 0) → { withdrawn, spent, balance }`
  - `rawCashBalance` semantics: balance without offset = withdrawals − spent; with offset added

- [ ] **Step 1: Write failing tests**

Create `src/lib/calc.cashBalance.test.mjs`:

```js
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { cashBalanceAllTime, homeCashSummary } from './calc.js'

const txs = [
  { kind: 'cash_withdrawal', amount: 100, date: '2026-01-10', type: 'expense', paymentMethod: 'bank', currency: 'TND' },
  { kind: 'normal', type: 'expense', paymentMethod: 'cash', currency: 'TND', amount: 30, date: '2026-01-15' },
]

describe('cash balance offset', () => {
  it('defaults offset to 0', () => {
    assert.equal(cashBalanceAllTime(txs), 70)
  })

  it('adds offset to all-time balance', () => {
    assert.equal(cashBalanceAllTime(txs, undefined, 25), 95)
  })

  it('homeCashSummary applies offset only to balance', () => {
    const s = homeCashSummary(txs, '2026-01', 25)
    assert.equal(s.withdrawn, 100)
    assert.equal(s.spent, 30)
    assert.equal(s.balance, 95)
  })
})
```

- [ ] **Step 2: Run tests — expect fail if signature not updated**

```bash
node --test src/lib/calc.cashBalance.test.mjs
```

Expected: fail or wrong balance until implementation.

- [ ] **Step 3: Implement calc**

```js
export function cashBalanceAllTime(transactions, beforeMonth, offset = 0) {
  // ... existing loop ...
  return withdrawals - spent + (offset || 0)
}

export function homeCashSummary(transactions, yearMonth, offset = 0) {
  // ... existing withdrawn/spent ...
  const balance = cashBalanceAllTime(transactions, undefined, offset)
  return { withdrawn, spent, balance }
}
```

- [ ] **Step 4: Re-run tests — expect pass**

```bash
node --test src/lib/calc.cashBalance.test.mjs
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/calc.js src/lib/calc.cashBalance.test.mjs
git commit -m "feat: apply cashBalanceOffset in home cash calc"
```

---

### Task 3: Frontend storage default + MonthlyPage + HomeCashPanel

**Files:**
- Modify: `src/services/storage.js`
- Modify: `src/pages/MonthlyPage.jsx`
- Modify: `src/components/HomeCashPanel.jsx`
- Modify: `src/i18n.js` (optional hint)

**Interfaces:**
- Consumes: `homeCashSummary(txs, yearMonth, offset)`, `saveSettings({ cashBalanceOffset })`, `cashBalanceAllTime` for raw when saving
- Produces: editable balance UI; persisted offset

- [ ] **Step 1: Default in storage.js**

```js
const DEFAULT_SETTINGS = {
  language: 'ar',
  theme: 'light',
  salary: 0,
  fundSplits: { commitments: 40, personal: 20, investment: 40 },
  cashBalanceOffset: 0,
}
```

- [ ] **Step 2: MonthlyPage state + wiring**

- State: `cashBalanceOffset` (number, default 0).
- In `refresh`, `setCashBalanceOffset(settings.cashBalanceOffset ?? 0)`.
- `cashSummary = homeCashSummary(transactions, yearMonth, cashBalanceOffset)`.
- Handler:

```js
async function handleBalanceCorrect(targetAmount) {
  const raw = cashBalanceAllTime(transactions) // no offset
  const nextOffset = targetAmount - raw
  await saveSettings({ cashBalanceOffset: nextOffset })
  setCashBalanceOffset(nextOffset)
}
```

Pass `onBalanceCorrect={handleBalanceCorrect}` into `HomeCashPanel`. On save failure, do not update local offset (leave previous).

- [ ] **Step 3: Inline edit in HomeCashPanel**

Props: `{ lang, summary, onBalanceCorrect }`.

Behavior:
- Click amount → show `<input type="number" step="any">` prefilled with current balance.
- Enter / blur → parse float; if `Number.isFinite(n)`, call `await onBalanceCorrect(n)` then exit edit; else cancel.
- Escape → cancel.
- `cursor-pointer` on the amount; optional title/aria-label from i18n (`editBalance` / Arabic equivalent).
- While saving, disable input or ignore double-submit.

- [ ] **Step 4: Manual verify**

1. Open monthly page → balance matches old behavior with offset 0.
2. Click balance → set to a known true amount → Enter → value sticks after refresh.
3. Log a cash expense → balance decreases from corrected point.

- [ ] **Step 5: Commit**

```bash
git add src/services/storage.js src/pages/MonthlyPage.jsx src/components/HomeCashPanel.jsx src/i18n.js
git commit -m "feat: inline edit home cash balance via settings offset"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| `cashBalanceOffset` in settings | 1 |
| Ensure column for existing DB | 1 |
| Formula with offset | 2 |
| Inline edit Enter/blur/Escape | 3 |
| Persist via saveSettings | 3 |
| Later txs still move balance | 2+3 |
| Invalid input cancels | 3 |
| No history / settings page | out of scope |

## Execution

User requested immediate implementation → **inline execution** in this session.
