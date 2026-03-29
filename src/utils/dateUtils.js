export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const date = formatDate(dateStr)
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`
  return formatDate(dateStr)
}

export function getDday(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
}

const WEEKDAYS = ['\uc77c', '\uc6d4', '\ud654', '\uc218', '\ubaa9', '\uae08', '\ud1a0']

export function formatDateWithDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const date = `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`
  const day = WEEKDAYS[d.getDay()]
  const h = d.getHours()
  const m = d.getMinutes()
  if (h === 0 && m === 0) return `${date} (${day})`
  return `${date} (${day}) ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function parseCalendarTitle(raw) {
  if (!raw) return { type: '', location: '', time: '' }
  const cleaned = raw.replace(/\[.+?\]/g, '').trim()
  const parts = cleaned.split('|').map((s) => s.trim())
  const type = parts[0] || ''
  let location = ''
  let time = ''
  if (parts.length > 1) {
    const locPart = parts[parts.length - 1]
    const timeMatch = locPart.match(/(\d{1,2}:\d{2})/)
    if (timeMatch) {
      time = timeMatch[1]
      location = locPart.replace(timeMatch[0], '').trim()
    } else {
      location = locPart
    }
  }
  return { type, location, time }
}
