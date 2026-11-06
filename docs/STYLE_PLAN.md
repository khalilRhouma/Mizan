# Style plan — a modern, premium look

Status: **planned, not started.** Do this after the remaining UX items in `ROADMAP.md`
(or together with them: the bottom tab bar and the day-grouped list are part of the new look).

## Goal
The app should feel calm, fast and expensive, like a good banking app.
It is used mostly **in Arabic (RTL), on an Android phone**, so we design for that first,
then check desktop and English.

## What we have today
- Warm palette: cream background `#f3f0ee`, ink `#141413`, orange accent `#f37338`, dark mode.
- Font: **Sofia Sans**. It has **no Arabic letters**, so Arabic text falls back to the phone's
  default font. This is the biggest reason the app does not look premium in Arabic.
- Fonts come from Google Fonts. **They do not load offline**, so the installed app changes font
  when the Mac is off.
- Very round cards (40px), thick borders, emoji in some places, no icon set, almost no motion.
- Numbers are not tabular, so amounts in a list do not line up.

## Design direction
"Quiet luxury": few colors, a lot of space, strong numbers, soft depth.

| Topic | Today | New |
|---|---|---|
| Arabic font | system fallback | **IBM Plex Sans Arabic** (or Readex Pro), self-hosted |
| Latin font | Sofia Sans (Google) | **Inter** or keep Sofia Sans, self-hosted |
| Numbers | normal | tabular figures (`font-variant-numeric: tabular-nums`), bigger for totals |
| Colors | cream + orange | keep the brand (wallet icon), add one deep green or ink for money in/out, softer borders |
| Cards | 40px radius, border | 24px radius, no border, a very soft shadow or a 1px hairline |
| Icons | emoji / none | one line icon set (lucide) |
| Motion | none | short, small: list items fade in, sheets slide up, numbers count up |
| Phone nav | top pills, 2 rows | bottom tab bar with a big center "+" button |
| Forms | long form on the page | bottom sheet for add/edit |
| Loading | "…" | skeletons |

## Packages (use existing ones, do not build our own)
| Need | Chosen | Considered | Why |
|---|---|---|---|
| Self-hosted fonts | **@fontsource/ibm-plex-sans-arabic**, **@fontsource-variable/inter** | Google Fonts link (today) | Works offline in the PWA, cached by the service worker. MIT/OFL. |
| Icons | **lucide-react** | heroicons, react-icons | Clean line style, tree-shaken, ISC licence, very active. |
| Bottom sheet (phone) | **vaul** | Radix Dialog alone, own code | Native-feeling drag-to-close sheet, built on Radix, MIT. |
| Menus, dialogs, tabs | **@radix-ui/react-*** (only the parts we need) | headless own code | Accessible and RTL-aware, no style imposed. |
| Motion | **motion** (Framer Motion) | CSS only | Simple list and layout animations; respect "reduce motion". Optional: start with CSS. |
| Number animation | **@number-flow/react** | own counter | Smooth animated totals on the dashboard. Optional. |
| Charts | keep **Recharts** | — | Only restyle: thinner bars, rounded tops, no grid lines, brand colors. |

Not chosen: a full UI kit (MUI, Chakra, shadcn copied in). Too heavy or too much code we would own;
we already have Tailwind and design tokens.

## Steps (one small branch each, screenshots before/after with demo data only)
1. **Foundations** — self-hosted fonts (Arabic + Latin), tabular numbers, new tokens in
   `src/index.css` and `tailwind.config.js` (radius, shadow, spacing, type scale).
   Check light and dark. Nothing else changes yet.
2. **Icons** — lucide-react in nav, buttons, payment methods and categories (one icon per category).
3. **Phone shell** — bottom tab bar (Log, Dashboard, Monthly, Year) + center "+" that opens quick add.
   Safe area padding for Android gesture bar.
4. **Log page** — list grouped by day with day totals, friendlier dates, category icon + colored dot,
   swipe or long-press for edit/delete. Add/edit opens in a bottom sheet (vaul).
5. **Dashboard** — a hero card with the month balance in big numbers, small "vs last month" chips,
   restyled charts, skeletons while loading.
6. **Motion and polish** — small transitions, haptic-like press states (`active:scale-[0.98]`),
   empty states with a short friendly line, final RTL check.

## Rules
- RTL first: use logical classes (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`), test every screen in Arabic.
- Contrast AA in light and dark. Status never by color only.
- Touch targets at least 44px.
- Respect `prefers-reduced-motion`.
- Keep the bundle small: check the size after each step (`npm run build`).
- Screenshots for the README only from the demo DB (`scripts/seed_demo.py`), never real data.

## How we check it
- Build a quick mockup first (a static HTML page or a screenshot) for steps 3–5 and agree on it
  before coding.
- After each step: lint, frontend tests, the real phone over Tailscale, light + dark, Arabic + English.
