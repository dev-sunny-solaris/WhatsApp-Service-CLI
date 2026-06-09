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

### `/send text`

Send a plain text message to a WhatsApp number or group.

```
/send text <to> <message>
```

| Argument | Description |
|----------|-------------|
| `to` | Recipient — phone number in international format (e.g. `628123456789`) or group ID |
| `message` | Message text (spaces allowed, everything after `<to>` is the message) |

**Example:**
```
/send text 628123456789 Hello! How are you?
```

---

### `/send media`

Upload a file and send it as a media message. Supports images, video, audio, and documents.

```
/send media <to> <file_path> [caption]
```

| Argument | Description |
|----------|-------------|
| `to` | Recipient phone number or group ID |
| `file_path` | Absolute or relative path to the file |
| `caption` | Optional caption text (spaces allowed) |

**Upload behavior:**
- Files ≤ 2 MB: direct upload in a single request
- Files > 2 MB: chunked upload (2 MB chunks)
- Upload progress is shown in the terminal during transfer

**Supported formats:** jpg, jpeg, png, gif, webp, mp4, mov, avi, mp3, ogg, wav, pdf, doc, docx, xls, xlsx, and more

**Examples:**
```
/send media 628123456789 /home/user/photo.jpg
/send media 628123456789 /home/user/document.pdf Please review this document
/send media 628123456789 "/home/user/my photo.jpg"
/send media 628123456789 "/home/user/my photo.jpg" "Please review this"
```

---

## Webhook

### `/webhook set`

Configure the webhook URL where incoming messages and status events will be delivered.

```
/webhook set <url> [secret]
```

| Argument | Description |
|----------|-------------|
| `url` | HTTPS URL to receive webhook events |
| `secret` | Optional signing secret for request verification |

The webhook receives POST requests for incoming messages, delivery receipts, and connection status changes.

**Examples:**
```
/webhook set https://myapp.example.com/webhook
/webhook set https://myapp.example.com/webhook mysecretkey123
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
