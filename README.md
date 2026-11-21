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

## Railway deployment and WhatsApp pairing code

1. Push these files to the GitHub repository connected to Railway.
2. In Railway, open the service connected to that repository.
3. In **Settings → Build**, set the Start Command to `npm start`.
   Leave the Build Command on Railway's automatic/default setting.
4. Add a Railway **Volume** and mount it at `/data`.
5. In **Variables**, add:
   - `AUTH_DIR` = `/data/auth`
   - `PAIRING_NUMBER` = your full WhatsApp number in international format, digits only
   - `BOT_PREFIX` = `!` (optional)
   - `LOG_LEVEL` = `info` (optional)
6. Redeploy the service and open **Deployments → View Logs**.
7. Copy the 8-digit pairing code from the logs. On your phone, open:
   **WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead**.
8. Enter the code shown in Railway logs.

Example: for an Indian number, include country code `91` followed by the mobile number, with no `+`, spaces, or hyphens. Do not put your phone number in GitHub files; add it only as a Railway Variable.

The volume is important: without persistent storage, WhatsApp login credentials
may be lost when the service is redeployed or restarted. Once paired, you can remove
the `PAIRING_NUMBER` variable if you prefer; keep the volume and `AUTH_DIR`.

## Important

- Run this as a Railway worker/service; it does not need a public web port.
- Never upload `.env`, WhatsApp session files, browser cookies, or credentials to GitHub.
- Treat the pairing code like a password. Never share it with anyone.
- If WhatsApp logs the session out, remove only the bot auth data from the mounted
  Railway volume and pair again using a fresh code.
