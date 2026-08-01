# Cash balance manual correction (offset)

**Date:** 2026-08-01  
**Status:** Approved design

## Problem

The home cash panel shows **الرصيد الحالي / Current balance** as an all-time computed value:

`withdrawals − cash TND expenses`

There is no way to set the true cash-on-hand when that number is wrong (e.g. cash that existed before tracking started, or unlogged history). Users need to correct the displayed balance while still letting later withdrawals and cash expenses move it.

## Goal

Allow inline edit of the current-balance amount on the home cash card. Persist a correction so:

- displayed balance matches what the user typed, and
- later cash activity continues to change the balance from that corrected point.

## Non-goals

- Adjustment history / audit log of past corrections
- Settings-page UI for the offset
- Changing how “withdrawn this month” or “spent from cash” are calculated
- Month-scoped balance (balance remains all-time)

## Approach

Store a single numeric **`cashBalanceOffset`** in app settings (default `0`).

When the user sets a target balance `T`:

```
offset = T − (all-time withdrawals − all-time cash TND expenses)
```

Displayed balance:

```
(all-time withdrawals − all-time cash TND expenses) + offset
```

Later cash withdrawals and cash expenses change the computed part; the offset stays fixed until the next manual edit.

## Data model

### Backend

- Add column on `settings`: `cash_balance_offset` (float, default `0`).
- Expose as `cashBalanceOffset` on settings GET/PATCH schemas (`SettingsIn` / `SettingsOut`).
- Missing / null treated as `0` in API defaults.
- **Existing DBs:** `create_all` alone does not add columns. Include a small startup ensure step (e.g. `ALTER TABLE settings ADD COLUMN IF NOT EXISTS cash_balance_offset ...`) or equivalent so existing installs pick up the field without a full reset.

### Frontend

- Add `cashBalanceOffset: 0` to `DEFAULT_SETTINGS` in `src/services/storage.js`.
- Load with existing `getSettings()` / save with `saveSettings({ cashBalanceOffset })`.

## Calculation changes

- `cashBalanceAllTime` / `homeCashSummary` accept the offset (or receive it from the caller) and return:

  `balance = (withdrawals − spent) + offset`

- Withdrawal and spent filters unchanged (`cash_withdrawal`; expense + `paymentMethod === 'cash'` + `currency === 'TND'` + normal transactions).

## UI

Component: `HomeCashPanel` on the monthly page.

- Only the **current balance** amount is editable.
- Click the amount → inline number input.
- **Enter** or **blur** confirms; **Escape** cancels (no save).
- On confirm: parse number → compute new offset from current transactions → `saveSettings` → update local state / re-render.
- Empty or non-numeric input → cancel (no save).
- Negative targets allowed.
- Keep existing success/danger coloring by sign.
- Light affordance that the value is editable (pointer cursor and/or small edit hint). No new card chrome.
- Withdrawn / spent cards remain read-only.

## Wiring

1. `MonthlyPage` already loads settings; also keep `cashBalanceOffset` in state.
2. Pass offset into `homeCashSummary(transactions, yearMonth, offset)` (or equivalent).
3. Pass offset (and a save handler, or enough context) into `HomeCashPanel` so the panel can compute and persist a new offset on edit.

## Error handling

- API save failure: keep edit UI honest (show error or revert to previous displayed value; do not leave a false “saved” balance). Prefer simple revert + optional short error message consistent with the app.
- No special migration beyond default `0` for existing DBs.

## Success criteria

1. User clicks balance, types real cash-on-hand, presses Enter → displayed value matches.
2. Adding a cash expense or cash withdrawal afterward moves the balance from that corrected point.
3. Refresh / reload preserves the correction (offset in settings).
4. Without ever editing, behavior matches today (`offset === 0`).

## Files likely touched

- `backend/app/models.py`, `schemas.py`, `crud.py`, `main.py` (or small helper for ensure-column on startup)
- `src/services/storage.js`
- `src/lib/calc.js`
- `src/components/HomeCashPanel.jsx`
- `src/pages/MonthlyPage.jsx`
- `src/i18n.js` (only if a short edit hint string is needed)
