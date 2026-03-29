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

// 한국 사건번호 패턴: 2023가합102415, 2024나91606 등
const CASE_NUMBER_RE = /(\d{4}\s*[가-힣]{1,3}\s*\d+)/

// 엘박스 형태: [에스케이] 변론 | 수원지방법원-2024나91606 | 법정동 제206호 법정
// 법원 관련 키워드
const COURT_KEYWORDS = /법원|변론|조정|선고|증인|감정|법정|기일/

/**
 * 사용자의 모든 캘린더 목록 조회
 */
async function listCalendars() {
  const data = await calendarRequest(
    `${CALENDAR_API}/users/me/calendarList`
  )
  return data?.items || []
}

/**
 * 특정 캘린더에서 이벤트 조회
 */
async function fetchEventsFromCalendar(calendarId, timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin: new Date(timeMin).toISOString(),
    timeMax: new Date(timeMax).toISOString(),
    maxResults: '500',
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  try {
    const data = await calendarRequest(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
    )
    return data?.items || []
  } catch {
    return []
  }
}

/**
 * Google Calendar에서 기일 이벤트 가져오기
 * 모든 캘린더를 검색하여 엘박스 등에서 동기화된 기일 포함
 */
export async function fetchCalendarEvents(timeMin, timeMax) {
  // 모든 캘린더에서 이벤트 수집
  const calendars = await listCalendars()
  const allItems = []

  for (const cal of calendars) {
    const events = await fetchEventsFromCalendar(cal.id, timeMin, timeMax)
    allItems.push(...events)
  }

  return allItems
    .filter((ev) => {
      const summary = ev.summary || ''
      return CASE_NUMBER_RE.test(summary) || COURT_KEYWORDS.test(summary)
    })
    .map((ev) => {
      const summary = ev.summary || ''
      const caseNumberMatch = summary.replace(/\s/g, '').match(CASE_NUMBER_RE)
      return {
        id: ev.id,
        calendarEventId: ev.id,
        summary,
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
  // 사건번호에서 공백, 하이픈 제거 후 비교
  const normalized = caseNumber.replace(/[\s\-]/g, '')
  return events.filter((ev) => {
    const evNum = ev.caseNumber.replace(/[\s\-]/g, '')
    const evSummary = ev.summary.replace(/[\s\-]/g, '')
    return evNum === normalized || evSummary.includes(normalized)
  })
}

// --- 일정(스케줄) 캘린더 연동 ---

export async function createScheduleCalendarEvent(schedule) {
  const summary = `[${schedule.type}] ${schedule.title}`
  const description = [
    schedule.location && `장소: ${schedule.location}`,
    schedule.note,
  ].filter(Boolean).join('\n')

  const body = { summary, description }

  if (schedule.allDay) {
    const dateStr = schedule.datetime.slice(0, 10)
    body.start = { date: dateStr }
    body.end = { date: dateStr }
  } else {
    body.start = { dateTime: new Date(schedule.datetime).toISOString() }
    body.end = {
      dateTime: schedule.endDatetime
        ? new Date(schedule.endDatetime).toISOString()
        : addHours(schedule.datetime, 1),
    }
  }

  if (schedule.location) body.location = schedule.location

  body.reminders = {
    useDefault: false,
    overrides: [
      { method: 'popup', minutes: 60 },
      { method: 'popup', minutes: 10 },
    ],
  }

  return calendarRequest(`${CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateScheduleCalendarEvent(eventId, schedule) {
  const summary = `[${schedule.type}] ${schedule.title}`
  const description = [
    schedule.location && `장소: ${schedule.location}`,
    schedule.note,
  ].filter(Boolean).join('\n')

  const body = { summary, description }

  if (schedule.allDay) {
    const dateStr = schedule.datetime.slice(0, 10)
    body.start = { date: dateStr }
    body.end = { date: dateStr }
  } else {
    body.start = { dateTime: new Date(schedule.datetime).toISOString() }
    body.end = {
      dateTime: schedule.endDatetime
        ? new Date(schedule.endDatetime).toISOString()
        : addHours(schedule.datetime, 1),
    }
  }

  if (schedule.location) body.location = schedule.location

  body.reminders = {
    useDefault: false,
    overrides: [
      { method: 'popup', minutes: 60 },
      { method: 'popup', minutes: 10 },
    ],
  }

  return calendarRequest(
    `${CALENDAR_API}/calendars/primary/events/${eventId}`,
    { method: 'PUT', body: JSON.stringify(body) }
  )
}

export async function deleteCalendarEvent(eventId) {
  return calendarRequest(
    `${CALENDAR_API}/calendars/primary/events/${eventId}`,
    { method: 'DELETE' }
  )
}
