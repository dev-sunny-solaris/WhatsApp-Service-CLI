# Solaris WhatsApp CLI — Project Brief

## Konteks: WhatsApp Service API

Base auth:
- Admin: header `X-Api-Key: SERVICE_KEY` + `X-Access-Token: {token}`
- Client/Device: header `X-Api-Key: DEVICE_API_KEY` + `X-Device-Id: DEVICE_ID`

Admin login flow:
```
POST /admin/login  body: { otp, name? }  header: X-Api-Key: SERVICE_KEY
→ returns { access_token }
```

### Admin Endpoints
```
POST   /admin/login
GET    /admin/tokens
POST   /admin/tokens/revoke
POST   /admin/tokens/revoke-all
POST   /devices                           body: { name }
GET    /devices
GET    /devices/:id
DELETE /devices/:id
POST   /devices/:id/revoke-key
POST   /devices/:id/unlock
POST   /devices/:id/quota/apply           body: { package, quota_total?, period_days?, daily_limit?, rate_limit_* }
DELETE /devices/:id/quota
GET    /packages                          (shared with client)
```

### Client Endpoints
```
GET    /me
PATCH  /me/webhook                        body: { webhook_url, webhook_secret? }
POST   /me/connect
POST   /me/logout
GET    /me/qr                             SSE stream → events: { type: 'qr'|'status', qr?, status? }
POST   /messages/send/text               body: { to, message }
POST   /messages/send/media              body: { to, upload_id, caption? }
POST   /media/upload/init                body: { filename, mimetype, size } → { upload_id }
POST   /media/upload/:upload_id/chunk?index=N   body: raw binary (application/octet-stream), max 2 MB
POST   /media/upload/:upload_id/complete
POST   /media/upload/direct              multipart/form-data, max 2 MB → { upload_id }
GET    /packages
```

---

## Desain CLI

**UI:** ink (React for terminal) — chat-like interface, `/` prefix triggers command dropdown dengan autocomplete.

### State Machine
```
UNAUTHENTICATED → /login       → CLIENT
UNAUTHENTICATED → /login-admin → ADMIN
CLIENT / ADMIN  → /logout      → UNAUTHENTICATED
```

Switch role = `/logout` dulu → login ulang dengan role lain.

**Credential storage:** AES-256-GCM encrypted di `~/.config/solaris-whatsapp-cli/`. Key dari machine ID + username. Tidak ada native deps.

```
~/.config/solaris-whatsapp-cli/
  config.json         # plaintext: BASE_URL
  credentials.enc     # AES-256-GCM: SERVICE_KEY, ACCESS_TOKEN, DEVICE_ID, DEVICE_API_KEY
```

---

## Command Map

### UNAUTHENTICATED
```
/login             prompt: BASE_URL, DEVICE_ID, DEVICE_API_KEY
/login-admin       prompt: BASE_URL, SERVICE_KEY, OTP
/config url        set/view BASE_URL
```

### ADMIN
```
/logout
/devices list
/devices create                    prompt: name
/devices get      [device_id?]
/devices delete   [device_id?]
/devices revoke-key [device_id?]
/devices unlock   [device_id?]
/quota apply      [device_id?]     → select device → select package → custom fields jika "custom"
/quota remove     [device_id?]
/tokens list
/tokens revoke                     → select dari token list
/tokens revoke-all
/packages
```

### CLIENT
```
/logout
/me
/connect                           POST /me/connect → SSE /me/qr → render QR ASCII art, live update
/send text                         prompt: to, message
/send media                        prompt: to, file path, caption?
/webhook set                       prompt: URL, secret
/packages
```

### Interactive Select Pattern
Parameter yang bisa di-lookup (device_id, package, token): jika tidak dicantumkan inline → tampil select prompt.
Inline tetap supported: `/devices delete device-abc123`

| Command | Lookupable |
|---------|-----------|
| `/devices *` | `device_id` → `GET /devices` |
| `/quota apply` | `device_id` → devices, `package` → `GET /packages` |
| `/quota remove` | `device_id` → devices |
| `/tokens revoke` | `token` → `GET /admin/tokens` |

---

## `/connect` QR Flow
```
POST /me/connect
→ subscribe SSE GET /me/qr
→ event { type: 'qr' }    → render/update QR ASCII art
→ event { type: 'status' } → tampil status
→ status === 'CONNECTED'  → close stream, tampil sukses
```

---

## `/send media` Upload Strategy
```
File ≤ 2 MB → prompt: direct (recommended) / chunked
File > 2 MB → auto chunked, skip prompt

Direct:
  POST /media/upload/direct (multipart)
  → upload_id → POST /messages/send/media

Chunked:
  POST /media/upload/init
  → split file ke 2 MB chunks
  → upload tiap chunk sequential dengan progress bar
  → POST /media/upload/:id/complete
  → upload_id → POST /messages/send/media
```

---

## Tech Stack
```json
{
  "ink": "^5.x",
  "react": "^18.x",
  "chalk": "^5.x",
  "axios": "^1.x",
  "eventsource": "^3.x",
  "conf": "^12.x",
  "qrcode": "^1.x"
}
```

---

## Struktur Folder
```
src/
  index.ts
  config/
    store.ts           # config.json (plaintext: BASE_URL)
    credentials.ts     # AES-256-GCM encrypt/decrypt
  api/
    client.ts          # axios base, attach headers, normalize error
    admin.ts           # admin API calls
    device.ts          # device/client API calls
  state/
    session.ts         # current role + credentials in memory
  commands/
    registry.ts        # register + filter by role
    shared/
      logout.ts
    admin/
      login-admin.ts
      devices.ts
      quota.ts
      tokens.ts
    client/
      login.ts
      me.ts
      connect.ts       # SSE + QR render
      send.ts
      upload.ts        # direct + chunked upload logic, progress emitter
      webhook.ts
  ui/
    App.tsx            # root ink component
    ChatHistory.tsx    # output log (scrollable)
    InputBar.tsx       # text input + "/" trigger
    CommandDropdown.tsx
    SelectPrompt.tsx   # interactive select (device, package, token)
    QRDisplay.tsx      # QR ASCII art
    Spinner.tsx
    theme.ts
```

---

## Build Plan

| Fasa | Scope |
|------|-------|
| 1 | Project setup — TS, ink, deps, tsconfig, package.json, entry |
| 2 | Config store + credential encryption (AES-256-GCM) |
| 3 | API client — base, admin, device modules |
| 4 | Session state + command registry |
| 5 | App shell — ink: ChatHistory, InputBar, `/` dropdown, Spinner |
| 6 | Auth — `/login`, `/login-admin`, `/logout` |
| 7 | Admin commands — `/devices`, `/quota`, `/tokens`, `/packages` |
| 8 | Client commands — `/me`, `/connect` (SSE+QR), `/send text`, `/send media`, `/webhook` |
| 9 | SelectPrompt — interactive select untuk lookupable params |
| 10 | Polish — error display, loading states, color theme |
