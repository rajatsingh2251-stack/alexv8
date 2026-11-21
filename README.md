# ALEX BOT — Railway starter

A minimal WhatsApp bot using Baileys. It responds only to explicit commands:
- `!ping`
- `!menu` / `!help`
- `!time`
- `!id`
- `!about`

This starter intentionally excludes bulk messaging, targeted spam, abusive loops,
automated group-name/description changes, and embedded browser cookies.

## GitHub files

Keep these files in the repository root:
- `alexv8.mjs`
- `package.json`
- `.gitignore`
- `.env.example`
- `README.md`

## Railway deployment

1. Push these files to the GitHub repository connected to Railway.
2. In Railway, open the service connected to that repository.
3. In **Settings → Build**, set the Start Command to `npm start`.
   Leave the Build Command on Railway's automatic/default setting.
4. Add a Railway **Volume** and mount it at `/data`.
5. In **Variables**, add:
   - `AUTH_DIR` = `/data/auth`
   - `BOT_PREFIX` = `!` (optional)
   - `LOG_LEVEL` = `info` (optional)
6. Deploy the service.
7. Open **Deployments → View Logs**. Scan the QR code shown there:
   WhatsApp → Linked devices → Link a device.

The volume is important: without persistent storage, WhatsApp login credentials
may be lost when the service is redeployed or restarted.

## Important

- Run this as a Railway worker/service; it does not need a public web port.
- Never upload `.env`, WhatsApp session files, browser cookies, or credentials to GitHub.
- If the old source contained real browser cookies, revoke/sign out those sessions
  in the affected services and do not reuse those cookie values.
- If WhatsApp logs the session out, remove only the bot auth data from the mounted
  Railway volume and pair again using a fresh QR code.
