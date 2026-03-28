import { useState, useMemo } from 'react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

function formatDate(d) {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function MiniCalendar({ events, onEventClick }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(new Date())

  const today = new Date()

  // 이벤트를 날짜별로 그룹핑
  const eventsByDate = useMemo(() => {
    const map = {}
    for (const ev of events) {
      const d = new Date(ev.date)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(ev)
    }
    return map
  }, [events])

  // 달력 날짜 배열 생성
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    // 이전 달 빈칸
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    // 이번 달
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d))
    }
    return days
  }, [currentMonth])

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const goToday = () => {
    const now = new Date()
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(now)
  }

  const getEventsForDate = (date) => {
    if (!date) return []
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    return eventsByDate[key] || []
  }

  const selectedEvents = getEventsForDate(selectedDate)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </span>
          <button
            onClick={goToday}
            className="text-xs text-blue-600 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50"
          >
            오늘
          </button>
        </div>
        <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`py-2 text-center text-xs font-medium ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 p-1">
        {calendarDays.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="h-9" />
          }

          const dayEvents = getEventsForDate(date)
          const isToday = isSameDay(date, today)
          const isSelected = isSameDay(date, selectedDate)
          const dayOfWeek = date.getDay()
          const hasHearing = dayEvents.some((e) => e.type === 'hearing')
          const hasDeadline = dayEvents.some((e) => e.type === 'deadline')

          return (
            <button
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              className={`h-9 flex flex-col items-center justify-center rounded-lg text-sm relative transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : isToday
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : dayOfWeek === 0
                      ? 'text-red-500 hover:bg-gray-50'
                      : dayOfWeek === 6
                        ? 'text-blue-500 hover:bg-gray-50'
                        : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {date.getDate()}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 absolute bottom-0.5">
                  {hasHearing && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`} />
                  )}
                  {hasDeadline && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-500'}`} />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 선택된 날짜의 일정 */}
      <div className="border-t border-gray-100 px-4 py-3">
        <p className="text-xs font-medium text-gray-500 mb-2">
          {formatDate(selectedDate)}
          {isSameDay(selectedDate, today) && ' (오늘)'}
        </p>
        {selectedEvents.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">일정 없음</p>
        ) : (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {selectedEvents.map((ev, i) => (
              <div
                key={i}
                onClick={() => onEventClick?.(ev)}
                className="flex items-start gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded p-1 -mx-1"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    ev.type === 'hearing' ? 'bg-red-500' : 'bg-orange-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-xs truncate">{ev.label}</p>
                  <p className="text-gray-400 text-xs">
                    {ev.time && `${ev.time} · `}
                    {ev.type === 'hearing' ? '기일' : '마감'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
