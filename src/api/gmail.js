import { useAuthStore } from '../auth/useAuth'

const GMAIL_API = 'https://www.googleapis.com/gmail/v1'

async function getToken() {
  const token = await useAuthStore.getState().getValidToken()
  if (!token) throw new Error('\uC778\uC99D\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.')
  return token
}

async function gmailRequest(url, options = {}) {
  const token = await getToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error.error?.message || `Gmail API \uC624\uB958 (${res.status})`)
  }

  return res.json()
}

/**
 * Search threads by query (e.g. from/to email address)
 */
export async function searchThreads(query, maxResults = 20) {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  })

  const data = await gmailRequest(
    `${GMAIL_API}/users/me/threads?${params.toString()}`
  )
  return data.threads || []
}

/**
 * Get thread metadata
 */
export async function getThread(threadId) {
  const data = await gmailRequest(
    `${GMAIL_API}/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
  )
  return data
}

/**
 * Get full message body (for preview)
 */
export async function getMessage(messageId) {
  const data = await gmailRequest(
    `${GMAIL_API}/users/me/messages/${messageId}?format=full`
  )
  return data
}

/**
 * Get threads related to a specific email address
 */
export async function getThreadsByEmail(email, maxResults = 20) {
  if (!email) return []
  const threads = await searchThreads(`from:${email} OR to:${email}`, maxResults)

  // Fetch metadata for each thread
  const detailed = await Promise.all(
    threads.slice(0, maxResults).map(async (t) => {
      try {
        const thread = await getThread(t.id)
        const firstMsg = thread.messages?.[0]
        const headers = {}
        for (const h of firstMsg?.payload?.headers || []) {
          headers[h.name] = h.value
        }
        return {
          id: thread.id,
          messageCount: thread.messages?.length || 0,
          subject: headers.Subject || '(\uC81C\uBAA9 \uC5C6\uC74C)',
          from: headers.From || '',
          to: headers.To || '',
          date: headers.Date || '',
          snippet: firstMsg?.snippet || '',
          timestamp: Number(firstMsg?.internalDate || 0),
        }
      } catch {
        return null
      }
    })
  )

  return detailed.filter(Boolean).sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Extract plain text body from message parts
 */
export function extractBody(payload) {
  if (!payload) return ''

  if (payload.body?.data) {
    try {
      return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
    } catch {
      return ''
    }
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        try {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'))
        } catch {
          continue
        }
      }
    }
    // Fallback: try first part recursively
    for (const part of payload.parts) {
      const result = extractBody(part)
      if (result) return result
    }
  }

  return ''
}
