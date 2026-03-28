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

// 한국 사건번호 패턴: 2023가합102415, 2024누36267 등
const CASE_NUMBER_RE = /(\d{4}[가-힣]{1,3}\d+)/

/**
 * Google Calendar에서 기일 이벤트 가져오기
 * 엘박스 등에서 동기화된 기일을 사건번호로 매칭
 * @param {string} timeMin - 조회 시작일 (ISO string)
 * @param {string} timeMax - 조회 종료일 (ISO string)
 */
export async function fetchCalendarEvents(timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    maxResults: '250',
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  const data = await calendarRequest(
    `${CALENDAR_API}/calendars/primary/events?${params.toString()}`
  )

  return (data?.items || [])
    .filter((ev) => CASE_NUMBER_RE.test(ev.summary || ''))
    .map((ev) => {
      const caseNumberMatch = ev.summary.match(CASE_NUMBER_RE)
      return {
        id: ev.id,
        calendarEventId: ev.id,
        summary: ev.summary || '',
        caseNumber: caseNumberMatch ? caseNumberMatch[1] : '',
        datetime: ev.start?.dateTime || ev.start?.date || '',
        endDatetime: ev.end?.dateTime || ev.end?.date || '',
        location: ev.location || '',
        description: ev.description || '',
      }
    })
}

/**
 * 특정 사건번호에 해당하는 캘린더 이벤트만 필터
 */
export function matchEventsToCaseNumber(events, caseNumber) {
  if (!caseNumber) return []
  // 사건번호에서 공백 제거 후 비교
  const normalized = caseNumber.replace(/\s/g, '')
  return events.filter((ev) => {
    const evNum = ev.caseNumber.replace(/\s/g, '')
    return evNum === normalized || ev.summary.replace(/\s/g, '').includes(normalized)
  })
}

export async function deleteCalendarEvent(eventId) {
  return calendarRequest(
    `${CALENDAR_API}/calendars/primary/events/${eventId}`,
    { method: 'DELETE' }
  )
}
