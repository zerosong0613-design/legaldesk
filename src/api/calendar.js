import { useAuthStore } from '../auth/useAuth'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

async function getToken() {
  const token = await useAuthStore.getState().getValidToken()
  if (!token) throw new Error('인증이 필요합니다.')
  return token
}

async function calendarRequest(url, options = {}) {
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
    throw new Error(error.error?.message || `Calendar API 오류 (${res.status})`)
  }

  if (res.status === 204) return null
  return res.json()
}

function addHours(dateStr, hours) {
  const d = new Date(dateStr)
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

export async function createCalendarEvent(hearing) {
  const summary = `[${hearing.caseNumber || ''}] ${hearing.clientName || ''} — ${hearing.type}`

  const description = [
    hearing.court && `법원: ${hearing.court}`,
    hearing.room && `법정: ${hearing.room}`,
    hearing.note,
  ]
    .filter(Boolean)
    .join('\n')

  return calendarRequest(`${CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    body: JSON.stringify({
      summary,
      description,
      start: { dateTime: new Date(hearing.datetime).toISOString() },
      end: { dateTime: addHours(hearing.datetime, 1) },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 * 24 * 7 }, // D-7
          { method: 'popup', minutes: 60 * 24 },      // D-1
          { method: 'popup', minutes: 60 * 9 },       // 당일 오전
        ],
      },
    }),
  })
}

export async function updateCalendarEvent(eventId, hearing) {
  const summary = `[${hearing.caseNumber || ''}] ${hearing.clientName || ''} — ${hearing.type}`

  const description = [
    hearing.court && `법원: ${hearing.court}`,
    hearing.room && `법정: ${hearing.room}`,
    hearing.note,
  ]
    .filter(Boolean)
    .join('\n')

  return calendarRequest(
    `${CALENDAR_API}/calendars/primary/events/${eventId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        summary,
        description,
        start: { dateTime: new Date(hearing.datetime).toISOString() },
        end: { dateTime: addHours(hearing.datetime, 1) },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 * 24 * 7 },
            { method: 'popup', minutes: 60 * 24 },
            { method: 'popup', minutes: 60 * 9 },
          ],
        },
      }),
    }
  )
}

export async function deleteCalendarEvent(eventId) {
  return calendarRequest(
    `${CALENDAR_API}/calendars/primary/events/${eventId}`,
    { method: 'DELETE' }
  )
}
