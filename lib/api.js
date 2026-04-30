/**
 * Server-side helper to proxy requests to the Predialnet API
 * using the admin bypass token from environment variables.
 */
const API_BASE = process.env.API_BASE_URL

export async function apiServer(method, path, body = null) {
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-access-token': process.env.ADMIN_BYPASS_TOKEN,
    },
    // No caching by default
    cache: 'no-store',
  }

  if (body !== null) {
    init.body = JSON.stringify(body)
  }

  const res = await fetch(`${API_BASE}${path}`, init)
  return res
}
