# Solaris WhatsApp CLI

Terminal interface for the **Solaris WhatsApp Service API**. Built with [ink](https://github.com/vadimdemedes/ink) (React for terminals).

## Requirements

- Node.js ≥ 20
- Access to a running Solaris WhatsApp Service instance

## Build

```bash
npm install
npm run build       # compile to dist/
npm start           # run from dist/
```

Development (no build step):

```bash
npm run dev
```

## Quick Start

### Admin Setup

```
/login-admin https://wa.example.com MY_SERVICE_KEY 123456
/devices create "Main Device"
/quota apply
```

### Client Usage

```
/login https://wa.example.com dev_abc123 apikey_xyz
/connect
/send text 628123456789 Hello World
```

## Commands Overview

| Command | Roles | Description |
|---------|-------|-------------|
| `/login-admin` | — | Authenticate as admin |
| `/login` | — | Authenticate as client device |
| `/logout` | admin, client | Clear session and credentials |
| `/help` | admin, client | Show available commands for current role |
| `/packages` | admin, client | List available quota packages |
| `/devices list` | admin | List all registered devices |
| `/devices create` | admin | Create a new device |
| `/devices get` | admin | Show device detail |
| `/devices delete` | admin | Delete a device |
| `/devices revoke-key` | admin | Rotate device API key |
| `/devices unlock` | admin | Unlock a locked device |
| `/quota apply` | admin | Apply quota package to device |
| `/quota remove` | admin | Remove quota from device |
| `/tokens list` | admin | List active admin tokens |
| `/tokens revoke` | admin | Revoke current session token |
| `/tokens revoke-all` | admin | Revoke all tokens |
| `/me` | client | Show connected device info (table) |
| `/connect` | client | Connect WhatsApp (scan QR) |
| `/disconnect` | client | Disconnect WhatsApp from phone (keeps CLI credentials) |
| `/contact check` | client | Check if phone is registered on WhatsApp |
| `/send` | client | Send a message (guided interactive flow) |
| `/send text` | client | Send a text message (prompts if args missing) |
| `/send media` | client | Send a media file (prompts if args missing) |
| `/webhook` | client | Configure webhook delivery (url / redis / redis-vpn) |

**Interactive select:** Commands that accept an optional `[device_id]` or `[package]` show an interactive selector when the argument is omitted. Use `↑↓` to navigate, `Enter` to select, `Esc` to cancel.

## Credential Storage

Credentials are encrypted (AES-256-GCM) and stored at:

```
~/.config/solaris-whatsapp-cli/
├── config.json          # BASE_URL (plaintext)
└── credentials.enc      # Encrypted credentials
```

The encryption key is derived from your system username and hostname — credentials are machine-specific. You must authenticate on each app launch.

## Detailed Command Reference

- [Admin Commands](docs/admin-commands.md) — authentication, devices, quota, tokens
- [Client Commands](docs/client-commands.md) — login, messaging, webhook, connection
