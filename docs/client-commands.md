# Client Commands

Commands available after authenticating with `/login`.

> **Arguments with spaces:** wrap in `"double quotes"` or `'single quotes'`.
> Example: `/send media 628xxx "/path/to/my file.jpg" "optional caption"`

---

## Authentication

### `/login`

Authenticate as a client device. No API call is made — credentials are validated by subsequent API requests.

```
/login <BASE_URL> <DEVICE_ID> <DEVICE_API_KEY>
```

| Argument | Description |
|----------|-------------|
| `BASE_URL` | WhatsApp Service base URL, e.g. `https://wa.example.com` |
| `DEVICE_ID` | Device ID provided by the admin (e.g. `dev_abc123`) |
| `DEVICE_API_KEY` | API key for this device (obtained from admin at device creation or key rotation) |

**Behavior:**
- Saves `BASE_URL` to `config.json` and encrypted credentials to `credentials.enc`
- Sets session role to `client`
- No network request — credentials are verified on first API call

**Example:**
```
/login https://wa.example.com dev_abc123 apikey_xyz789
```

---

## Device Info

### `/me`

Show information about the current device: connection status, phone number, daily usage, and quota.

```
/me
```

**Output includes:**
- Device ID and name
- Phone number (once WhatsApp is connected)
- Connection status (`connected` / `disconnected`)
- Daily messages used
- Quota summary (if a quota package is applied)

---

## Connection

### `/connect`

Initiate WhatsApp connection. Opens a server-sent event (SSE) stream and displays a QR code for scanning.

```
/connect
```

**Flow:**
1. Calls the connect API to initiate the connection process
2. Opens an SSE stream and waits for events
3. When a `qr` event is received — displays the QR code in the terminal
4. When `CONNECTED` status is received — clears the QR and confirms success
5. Resolves automatically on connection or error

**Notes:**
- Scan the QR code with WhatsApp on your phone (Linked Devices → Link a Device)
- The QR code refreshes automatically if it expires
- The command blocks until connected or an error occurs

---

## Messaging

All three send commands support **guided mode**: if required arguments are missing, the CLI will prompt for them interactively.

### `/send`

Fully guided send flow. Shows a type selector, then prompts for each argument.

```
/send
```

---

### `/send text`

Send a plain text message. Arguments are optional — missing ones are prompted interactively.

```
/send text [to] [message]
```

| Argument | Description |
|----------|-------------|
| `to` | Recipient phone number (e.g. `628123456789`). Prompted if omitted. |
| `message` | Message text (spaces allowed). Prompted if omitted. |

**Examples:**
```
/send text                          ← prompts for phone + message
/send text 628123456789             ← prompts for message only
/send text 628123456789 Hello!
```

---

### `/send media`

Upload a file and send it as a media message. Arguments are optional — missing ones are prompted interactively.

```
/send media [to] [file_path] [caption]
```

| Argument | Description |
|----------|-------------|
| `to` | Recipient phone number. Prompted if omitted. |
| `file_path` | Absolute or relative path to the file. Prompted if omitted. |
| `caption` | Optional caption text. Prompted if omitted; press **Esc** to skip. |

**Upload behavior:**
- Files ≤ 2 MB: direct upload in a single request
- Files > 2 MB: chunked upload (2 MB chunks), progress shown in terminal

**`--document` flag:** forces image/video/audio to be sent as a file attachment (no WhatsApp preview). Only works when all args are provided inline:
```
/send media 628123456789 /home/user/photo.jpg --document
```

**Examples:**
```
/send media                              ← prompts for all
/send media 628123456789                 ← prompts for file + caption
/send media 628123456789 /home/u/a.jpg
/send media 628123456789 "/my photo.jpg" "Please review"
```

---

## Contacts

### `/contact check`

Check whether a phone number is registered on WhatsApp. Returns the canonical JID and profile picture URL.

```
/contact check <phone>
```

| Argument | Description |
|----------|-------------|
| `phone` | Phone number in international format (e.g. `628123456789`) |

**Output includes:**
- Canonical phone number (normalized by the service)
- WhatsApp JID (`phone@s.whatsapp.net`)
- Profile picture URL (`none` if not available or privacy-blocked)

Returns a `NOT_ON_WHATSAPP` error if the number is not registered.

**Example:**
```
/contact check 628123456789
```

---

## Webhook

### `/webhook`

Configure how incoming events are delivered to your application. Three delivery types are supported.

```
/webhook [type] [args...]
```

If `type` is omitted, an **interactive selector** appears.

---

#### Type: `url`

Deliver events via HTTP POST to your server.

```
/webhook url <url> [secret]
```

| Argument | Description |
|----------|-------------|
| `url` | HTTPS endpoint to receive webhook events |
| `secret` | Optional HMAC-SHA256 signing secret |

**Examples:**
```
/webhook set url https://myapp.example.com/webhook
/webhook set url https://myapp.example.com/webhook mysecretkey123
```

---

#### Type: `redis`

Deliver events via Redis Pub/Sub. The service creates a dedicated ACL user restricted to a single channel.

```
/webhook redis
```

No arguments needed. On success, credentials are printed **once only** — save them immediately:

```
Host:     redis.example.com:6379
Username: wa_abc123_d4e5f6a7
Password: <64-hex-chars>
Channel:  wa:inbound:<device_id>:<token>
```

Calling `/webhook set redis` again revokes the previous credentials and issues new ones.

---

#### Type: `redis-vpn`

Same as `redis`, but intended for access over a WireGuard VPN tunnel. Stores your WireGuard public key for server-side peer registration.

```
/webhook redis-vpn <wg_pubkey>
```

| Argument | Description |
|----------|-------------|
| `wg_pubkey` | WireGuard public key of the consumer host |

**Example:**
```
/webhook set redis-vpn "abc123pubkeyBase64=="
```

---

## Shared Commands

These commands are available to both admin and client roles.

### `/packages`

List all available named quota packages and their limits.

```
/packages
```

---

### `/logout`

Clear the current session and delete stored credentials from disk.

```
/logout
```

After logging out, the app returns to the unauthenticated state.
