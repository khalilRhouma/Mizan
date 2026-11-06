# Use Mizan on your Android phone (free, private)

Goal: open the app from your phone anywhere (Wi-Fi or 4G), install it on the
home screen, and log a spend even when the Mac is off. No hosting, no cost.

How it works:
- **Tailscale** makes a private network between your Mac and your phone. Only
  your devices can see the app; nothing is public on the internet.
- `tailscale serve` gives the app a real **HTTPS** address. HTTPS is required:
  without it Chrome will not install the app and saving fails
  (`crypto.randomUUID()` and service workers need a secure page).
- The app is a **PWA**: when the Mac is off, it still opens (last data seen) and
  your saves wait on the phone, then are sent when the Mac is back.

---

## Quick start (about 10 minutes, once)

### 1. Run the full app on the Mac

```bash
cd finance-system
npm run docker:full        # db + api + web (nginx) on port 8080 + daily backup
```

Check: open http://localhost:8080 on the Mac.

Docker Desktop → Settings → General → tick **"Start Docker Desktop when you sign in"**.
All containers have `restart: unless-stopped`, so they come back by themselves
after a Mac restart.

### 2. Install Tailscale on the Mac and the phone

1. Mac: install from https://tailscale.com/download (or `brew install --cask tailscale`),
   open it and sign in.
2. Phone: install **Tailscale** from the Play Store, sign in with the **same account**.
3. In the admin page (https://login.tailscale.com/admin/dns) turn on **MagicDNS** and
   **HTTPS Certificates** (one click each).

### 3. Give the app an HTTPS address

On the Mac:

```bash
tailscale serve --bg 8080
tailscale serve status       # shows the address
```

Expected output (your names will differ):

```
https://my-mac.tail1234.ts.net (tailnet only)
|-- / proxy http://127.0.0.1:8080
```

`--bg` keeps it running in the background, also after a restart.

### 4. Install the app on the phone

1. On the phone, with Tailscale **on**, open `https://my-mac.tail1234.ts.net` in **Chrome**.
2. Menu ⋮ → **Install app** (or "Add to Home screen").
3. The **ميزان** wallet icon appears on the home screen.
4. Long-press the icon → **إضافة مصروف** opens quick add directly.

---

## Daily use

- Write the spend right away in quick add: `ليسونس 60`, `قهوة 3 البارح`…
- Mac off or no internet? Use the **form** (quick add needs the server to read
  text; your text stays in the box). The save shows
  "حُفظ على الهاتف وسيُرسل تلقائياً" and the header shows **⏳ N بانتظار الإرسال**.
- When the Mac is back, the saves are sent automatically (or tap **إرسال الآن**).

Keep Tailscale **on** on the phone (it uses very little battery).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| The address does not open | Tailscale must be on, on both devices. Check `tailscale status` on the Mac. |
| No "Install app" in Chrome | Use the `https://…ts.net` address, not `http://` or the IP. |
| "تعذّر الاتصال بالخادم" on first open | The very first open must reach the Mac (to download the app). |
| Saves stay "waiting" | Is Docker running on the Mac? `docker compose ps`. Then tap **إرسال الآن**. |
| App does not update after a change | Close and reopen it twice (the new version installs in the background). |
| Containers do not start after a reboot | Is Docker Desktop set to start at login? Then `npm run docker:full` once. |

Stop sharing: `tailscale serve --https=443 off`.
