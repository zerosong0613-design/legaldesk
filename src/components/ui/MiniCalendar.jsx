import { useState, useMemo } from 'react'
import { Card, Text, Group, ActionIcon, Badge, Stack, UnstyledButton, Box } from '@mantine/core'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

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

export default function MiniCalendar({ events, onEventClick }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(new Date())

  const today = new Date()

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

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
    return days
  }, [currentMonth])

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
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
    <Card padding={0}>
      {/* 헤더 */}
      <Group justify="space-between" px="md" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <ActionIcon variant="subtle" color="gray" onClick={prevMonth} size="sm">
          <IconChevronLeft size={16} />
        </ActionIcon>
        <Group gap="xs">
          <Text size="sm" fw={600}>
            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
          </Text>
          <UnstyledButton onClick={goToday}>
            <Text size="xs" c="indigo" fw={500}>오늘</Text>
          </UnstyledButton>
        </Group>
        <ActionIcon variant="subtle" color="gray" onClick={nextMonth} size="sm">
          <IconChevronRight size={16} />
        </ActionIcon>
      </Group>

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--mantine-color-gray-1)' }}>
        {WEEKDAYS.map((day, i) => (
          <Text
            key={day}
            ta="center"
            size="xs"
            fw={500}
            py={8}
            c={i === 0 ? 'red.4' : i === 6 ? 'blue.4' : 'dimmed'}
          >
            {day}
          </Text>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: 4 }}>
        {calendarDays.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} style={{ height: 36 }} />

          const dayEvents = getEventsForDate(date)
          const isToday = isSameDay(date, today)
          const isSelected = isSameDay(date, selectedDate)
          const dayOfWeek = date.getDay()
          const hasHearing = dayEvents.some((e) => e.type === 'hearing')
          const hasDeadline = dayEvents.some((e) => e.type === 'deadline')
          const hasSchedule = dayEvents.some((e) => e.type === 'schedule')

          const textColor = isSelected
            ? 'white'
            : dayOfWeek === 0
              ? 'var(--mantine-color-red-5)'
              : dayOfWeek === 6
                ? 'var(--mantine-color-blue-5)'
                : undefined

          return (
            <UnstyledButton
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              style={{
                height: 36,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                position: 'relative',
                backgroundColor: isSelected
                  ? 'var(--mantine-color-indigo-6)'
                  : isToday
                    ? 'var(--mantine-color-indigo-0)'
                    : undefined,
                color: textColor,
                fontWeight: isToday ? 600 : undefined,
                fontSize: 14,
              }}
            >
              {date.getDate()}
              {dayEvents.length > 0 && (
                <div style={{ display: 'flex', gap: 2, position: 'absolute', bottom: 2 }}>
                  {hasHearing && (
                    <span style={{
                      width: 4, height: 4, borderRadius: '50%',
                      backgroundColor: isSelected ? 'white' : 'var(--mantine-color-red-5)',
                    }} />
                  )}
                  {hasDeadline && (
                    <span style={{
                      width: 4, height: 4, borderRadius: '50%',
                      backgroundColor: isSelected ? 'white' : 'var(--mantine-color-orange-5)',
                    }} />
                  )}
                  {hasSchedule && (
                    <span style={{
                      width: 4, height: 4, borderRadius: '50%',
                      backgroundColor: isSelected ? 'white' : 'var(--mantine-color-blue-5)',
                    }} />
                  )}
                </div>
              )}
            </UnstyledButton>
          )
        })}
      </div>

      {/* 선택된 날짜의 일정 */}
      <Box px="md" py="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-1)' }}>
        <Text size="xs" fw={500} c="dimmed" mb="xs">
          {formatDate(selectedDate)}
          {isSameDay(selectedDate, today) && ' (오늘)'}
        </Text>
        {selectedEvents.length === 0 ? (
          <Text size="xs" c="dimmed" py="xs">일정 없음</Text>
        ) : (
          <Stack gap={6} mah={128} style={{ overflowY: 'auto' }}>
            {selectedEvents.map((ev, i) => (
              <UnstyledButton
                key={i}
                onClick={() => onEventClick?.(ev)}
                p={4}
                style={{ borderRadius: 4, display: 'flex', alignItems: 'flex-start', gap: 8 }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                  backgroundColor: ev.type === 'hearing'
                    ? 'var(--mantine-color-red-5)'
                    : ev.type === 'schedule'
                      ? 'var(--mantine-color-blue-5)'
                      : 'var(--mantine-color-orange-5)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="xs" truncate>{ev.label}</Text>
                  <Text size="xs" c="dimmed">
                    {ev.time && `${ev.time} · `}
                    {ev.type === 'hearing' ? '기일' : ev.type === 'schedule' ? '일정' : '마감'}
                  </Text>
                </div>
              </UnstyledButton>
            ))}
          </Stack>
        )}
      </Box>
    </Card>
  )
}
