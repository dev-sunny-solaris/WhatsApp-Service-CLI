# Changelog

## v0.2.1 — 15 Jun 2026

### Fixed

- `/connect` — handle `DISCONNECTED` status during QR stream: stop stream and report connection failed
- `/connect` — show `Waiting for QR...` on `QR_PENDING` before first QR is received instead of printing raw status

## v0.2.0 — 14 Jun 2026

### Added

- `showInput(prompt)` context method — inline text input mode; renders a prompt label below the input bar and waits for the next Enter; Esc cancels
- `showForm(title, fields, initial?)` context method + `FormPrompt` component — multi-field form overlay; supports `text` and `select` field types, optional fields, and dynamic field lists via `FormFieldsFn`; Tab / ↑↓ navigate between fields, Enter submit, Esc cancel
- `WelcomeBanner` component — gradient ASCII art "SOLARIS" logo displayed on startup when chat history is empty; replaced by `ChatHistory` once the first command runs
- `usage?: string` field on `CommandDef` — shown in autocomplete dropdown as arg hint next to command name
- `/disconnect` command (client) — calls `POST /me/logout`; disconnects WhatsApp from phone while keeping CLI credentials intact
- `/help` command (all roles) — prints all commands available to the current session role, grouped by command prefix and column-aligned with usage hint and description
- `/send` command — fully guided via `FormPrompt`: type selector (text / media) followed by role-specific fields
- Interactive fallback on `/send text` and `/send media` — missing args open a `FormPrompt` form overlay instead of showing a static error; pre-fills any args already supplied inline
- `setWebhookUrl`, `setWebhookRedisBasic`, `setWebhookRedisVpn` API functions — replaces `setWebhook`; aligns with service v0.3.2 which requires `type` field on `PATCH /me/webhook`
- `/webhook redis` — configure Redis Pub/Sub delivery; prints one-time credentials (host, port, username, password, channel)
- `/webhook redis-vpn <wg_pubkey>` — same as redis but for WireGuard VPN consumers; stores public key server-side
- `/webhook` with no args — shows interactive `FormPrompt` type selector (url / redis / redis-vpn)
- `checkContact(phone)` API function — `GET /contacts/:phone/check`
- `/contact check <phone>` command — checks if phone is registered on WhatsApp; returns phone, JID, and profile picture URL

### Changed

- `/me` now renders a 2-column `Field | Value` table via `writeTable` instead of plain lines
- `/webhook set` renamed to `/webhook`; syntax: `/webhook url|redis|redis-vpn [args]`
- `CommandDropdown` renders `/{name} {usage} — {description}` so users see expected args inline

### Fixed

- `/webhook` was always returning `400 VALIDATION_ERROR` — service v0.3.2 made `type` field mandatory; CLI was not sending it

---

## v0.1.0 — 09 Jun 2026

Initial release.

### Core Infrastructure
- Project setup: TypeScript ESM, ink v5, Vitest, tsup
- AES-256-GCM encrypted credential storage (`~/.config/solaris-whatsapp-cli/credentials.enc`), key derived from machine username + hostname
- Plaintext config store via `conf` (`~/.config/solaris-whatsapp-cli/config.json`) for BASE_URL
- Session state machine: `unauthenticated → admin | client`
- **Session persistence**: credentials restored automatically on CLI restart; exit without `/logout` keeps session alive
- Axios-based API client with role-aware header injection (`X-Api-Key`, `X-Device-Id` / `X-Access-Token`)
- Unified error normalizer for Axios errors and network failures
- Command registry with role-based filtering and longest-match dispatch
- Quoted-token argument parser for inline command arguments

### UI Shell (ink)
- Chat-like interface with `/`-prefix command dispatch
- **Scrollable chat history**: PgUp / PgDn scroll (5 lines per step); `↑ N messages above` indicator when scrolled up; auto-scroll to bottom on new command
- **Sticky input bar**: pinned to bottom of terminal using explicit `stdout.rows` height
- Full cursor support in input bar: left/right arrows, Ctrl+Left/Right (word jump), Ctrl+A/E (line start/end), Ctrl+U (clear line), Backspace, Alt+Backspace / Ctrl+W (delete word)
- Command history navigation: Up/Down arrows cycle through prior commands
- `/` dropdown autocomplete: filters commands by prefix, Tab/Enter to complete
- **Status bar** (pinned below input): connection status (●/○), phone number, daily usage / daily limit, app version (right-aligned)
- Status bar refreshes after every command dispatch and on startup

### Auth Commands
| Command | Role | Description |
|---------|------|-------------|
| `/login <BASE_URL> <DEVICE_ID> <DEVICE_API_KEY>` | unauthenticated | Login as client device |
| `/login-admin <BASE_URL> <SERVICE_KEY> <OTP>` | unauthenticated | Login as admin (OTP via server) |
| `/logout` | admin, client | Clear local credentials only — does not hit API; returns to unauthenticated |

### Admin Commands
| Command | Description |
|---------|-------------|
| `/devices list` | List all devices |
| `/devices create` | Create device (interactive name prompt) |
| `/devices get [id]` | Get device details; interactive select if ID omitted |
| `/devices delete [id]` | Delete device; interactive select if ID omitted |
| `/devices revoke-key [id]` | Revoke API key; interactive select if ID omitted |
| `/devices unlock [id]` | Unlock locked device; interactive select if ID omitted |
| `/quota apply [id]` | Apply quota package; interactive device + package select |
| `/quota remove [id]` | Remove quota package; interactive select if ID omitted |
| `/tokens list` | List admin access tokens |
| `/tokens revoke` | Revoke a token; interactive select from list |
| `/tokens revoke-all` | Revoke all tokens |
| `/packages` | List available quota packages |

### Client Commands
| Command | Description |
|---------|-------------|
| `/me` | Show device info and quota status |
| `/connect` | Connect WhatsApp: POST /me/connect → SSE stream → render QR; ESC to cancel |
| `/disconnect` | Disconnect phone from WhatsApp (POST /me/logout); CLI credentials kept |
| `/send text <to> <message>` | Send text message |
| `/send media <to> <file> [caption] [--document]` | Upload and send media/document; `--document` forces file attachment regardless of MIME type |
| `/webhook url <url> [secret]` | Set webhook URL and optional secret |
| `/packages` | List available quota packages |
| `/clear` | Clear chat history |
| `/exit` | Exit CLI (session preserved) |

### `/send media` Details
- Auto-detects MIME type from file extension (image, video, audio, document)
- Supported document types: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, ZIP, RAR, 7Z
- Files ≤ 2 MB: direct upload (`POST /media/upload/direct`)
- Files > 2 MB: chunked upload with progress bar (`init → chunk × N → complete`)
- `--document` flag: sends image/video/audio as file attachment instead of native WhatsApp media type (no preview)

### `/connect` QR Flow
- SSE stream implemented via `axios` with `responseType: 'stream'` (not `eventsource` — v3 removed `headers` from constructor)
- QR rendered as medium-size ASCII art via `qrcode` library
- Live status updates from SSE stream; auto-resolves on `CONNECTED`
- ESC cancels the QR display and stream

### Testing
- 163 unit tests across 25 test files
- Coverage: command handlers, API client, credential encryption/decryption, UI utilities (table formatter, spinner, progress), registry dispatch, session state
