import './commands/bootstrap.js'
import { render } from 'ink'
import { createElement } from 'react'
import { loadCredentials } from './config/credentials.js'
import { getBaseUrl } from './config/store.js'
import { setSession } from './state/session.js'
import App from './ui/App.js'

function restoreSession(): void {
  const baseUrl = getBaseUrl()
  if (!baseUrl) return

  const creds = loadCredentials()
  if (creds.accessToken) {
    setSession({ role: 'admin', baseUrl, credentials: creds })
  } else if (creds.deviceId && creds.deviceApiKey) {
    setSession({ role: 'client', baseUrl, credentials: creds })
  }
}

restoreSession()
render(createElement(App))
