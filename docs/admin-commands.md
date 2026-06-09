# Admin Commands

Commands available after authenticating with `/login-admin`.

> **Arguments with spaces:** wrap in `"double quotes"` or `'single quotes'`.
> Example: `/login-admin https://wa.example.com "my service key" 847291`

---

## Authentication

### `/login-admin`

Authenticate as admin. Requires an OTP from the WhatsApp Service admin interface.

```
/login-admin <BASE_URL> <SERVICE_KEY> <OTP>
```

| Argument | Description |
|----------|-------------|
| `BASE_URL` | WhatsApp Service base URL, e.g. `https://wa.example.com` |
| `SERVICE_KEY` | Admin service key configured on the server |
| `OTP` | One-time password from the admin TOTP authenticator |

**Behavior:**
- Calls the admin login API, obtains an access token
- Saves `BASE_URL` to `config.json` and encrypted credentials to `credentials.enc`
- Sets session role to `admin`

**Errors:**
- `ADMIN_LOCKED` — Too many failed attempts, temporary lockout
- `ADMIN_HARD_LOCKED` — Permanently locked, requires server-side `admin:unlock`

**Examples:**
```
/login-admin https://wa.example.com svckey_abc123 847291
/login-admin https://wa.example.com "my service key" 847291
```

---

## Devices

### `/devices list`

List all registered devices with their status and quota summary.

```
/devices list
```

**Output columns:** `id  name  [status]  quota`

---

### `/devices create`

Create a new device. Returns the device ID and API key — **save the API key**, it will not be shown again.

```
/devices create <name>
```

| Argument | Description |
|----------|-------------|
| `name` | Display name for the device (spaces allowed) |

**Examples:**
```
/devices create MainDevice
/devices create "Main WhatsApp Device"
```

---

### `/devices get`

Show full detail for a device: status, quota, rate limits, timestamps.

```
/devices get [device_id]
```

If `device_id` is omitted, an **interactive selector** appears with all devices.

---

### `/devices delete`

Permanently delete a device. This cannot be undone.

```
/devices delete [device_id]
```

If `device_id` is omitted, an **interactive selector** appears.

---

### `/devices revoke-key`

Rotate the API key for a device. The old key is immediately invalidated. Returns the new key.

```
/devices revoke-key [device_id]
```

If `device_id` is omitted, an **interactive selector** appears.

---

### `/devices unlock`

Unlock a device that has been locked (e.g. due to rate limit violations). Returns a new API key.

```
/devices unlock [device_id]
```

If `device_id` is omitted, an **interactive selector** appears.

---

## Quota

### `/quota apply`

Apply a quota package to a device.

```
/quota apply [device_id] [package]
```

Both arguments are optional — if omitted, **interactive selectors** appear for each.

**Named package:**
```
/quota apply dev_abc123 starter
```

**Custom package** (all numeric params required):
```
/quota apply dev_abc123 custom <quota_total> <period_days> <daily_limit>
```

| Argument | Description |
|----------|-------------|
| `quota_total` | Total message quota for the period (positive integer) |
| `period_days` | Period length in days (positive integer) |
| `daily_limit` | Max messages per day (positive integer) |

**Example — custom:**
```
/quota apply dev_abc123 custom 5000 30 200
```

**Note:** Available named packages can be viewed with `/packages`.

---

### `/quota remove`

Remove the quota from a device (unlimited usage).

```
/quota remove [device_id]
```

If `device_id` is omitted, an **interactive selector** appears.

---

## Tokens

### `/tokens list`

List all active admin tokens with their name, prefix, and creation date.

```
/tokens list
```

**Note:** Only the token prefix (`token_prefix`) is shown for security. Full tokens are never returned by the API.

---

### `/tokens revoke`

Revoke the **current session's** access token and log out.

```
/tokens revoke
```

This revokes the token used in the current session. You must re-authenticate after running this command.

---

### `/tokens revoke-all`

Revoke **all** admin tokens and log out. All active admin sessions across all machines will be invalidated.

```
/tokens revoke-all
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
