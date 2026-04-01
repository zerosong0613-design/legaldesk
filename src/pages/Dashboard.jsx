import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Group, Text, Badge, Card, Button, Checkbox,
  SimpleGrid, TextInput, Stack, Box, Alert,
  UnstyledButton, Container, ThemeIcon, ActionIcon,
  Divider,
} from '@mantine/core'
import {
  IconSearch, IconScale,
  IconFileText, IconClock, IconArrowRight, IconPlus, IconCalendarEvent,
  IconSun, IconCash, IconAlertCircle, IconReceipt,
} from '@tabler/icons-react'
import { fetchAllCalendarEvents } from '../api/calendar'
import { readCasesIndex } from '../api/drive'
import { useCaseStore } from '../store/caseStore'
import { useScheduleStore } from '../store/scheduleStore'
import { useUiStore } from '../store/uiStore'
import MiniCalendar from '../components/ui/MiniCalendar'
import Modal from '../components/ui/Modal'
import ScheduleForm from '../components/schedule/ScheduleForm'

function getDday(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (d.getHours() === 0 && d.getMinutes() === 0) return null
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const d = new Date(dateStr)
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 0) return formatDate(dateStr)
  if (diffMin < 1) return '\uBC29\uAE08 \uC804'
  if (diffMin < 60) return `${diffMin}\uBD84 \uC804`
  if (diffHour < 24) return `${diffHour}\uC2DC\uAC04 \uC804`
  if (diffDay < 7) return `${diffDay}\uC77C \uC804`
  return formatDate(dateStr)
}

function matchesQuery(item, q) {
  return (
    item.clientName?.toLowerCase().includes(q) ||
    item.caseNumber?.toLowerCase().includes(q) ||
    item.subject?.toLowerCase().includes(q) ||
    item.type?.toLowerCase().includes(q) ||
    item.court?.toLowerCase().includes(q) ||
    item.tags?.some((t) => t.toLowerCase().includes(q))
  )
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '0원'
  return amount.toLocaleString('ko-KR') + '원'
}

function isToday(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isThisWeek(dateStr) {
  const dday = getDday(dateStr)
  return dday !== null && dday >= 0 && dday <= 7
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { cases, consultations, casesFileId } = useCaseStore()
  const { schedules, createSchedule, updateSchedule, deleteSchedule, importFromCalendar } = useScheduleStore()
  const { searchQuery, setSearchQuery } = useUiStore()
  const showToast = useUiStore((s) => s.showToast)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [calImportEvents, setCalImportEvents] = useState(null)
  const [calImportSelected, setCalImportSelected] = useState(new Set())
  const [isImporting, setIsImporting] = useState(false)

  // 빌링 데이터 로드
  const [billingData, setBillingData] = useState({ retainers: [], disbursements: [], invoices: [] })
  useEffect(() => {
    if (!casesFileId) return
    readCasesIndex(casesFileId).then((data) => {
      setBillingData({
        retainers: data.retainers || [],
        disbursements: data.disbursements || [],
        invoices: data.invoices || [],
      })
    }).catch(() => {})
  }, [casesFileId])

  const handleFetchCalendarEvents = async () => {
    setIsImporting(true)
    try {
      const now = new Date()
      const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
      const allEvents = await fetchAllCalendarEvents(timeMin.toISOString(), timeMax.toISOString())

      // 이미 가져온 이벤트 제외
      const existingCalIds = new Set(schedules.map((s) => s.calendarEventId).filter(Boolean))
      const newEvents = allEvents.filter((ev) => !existingCalIds.has(ev.calendarEventId))

      setCalImportEvents(newEvents)
      setCalImportSelected(new Set(newEvents.map((ev) => ev.id)))
      if (newEvents.length === 0) showToast('가져올 새 일정이 없습니다.', 'info')
    } catch (err) {
      showToast(`캘린더 조회 실패: ${err.message}`, 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const handleImportSelected = async () => {
    if (!calImportEvents || calImportSelected.size === 0) return
    setIsImporting(true)
    try {
      const selected = calImportEvents.filter((ev) => calImportSelected.has(ev.id))
      const count = await importFromCalendar(selected)
      setCalImportEvents(null)
      setCalImportSelected(new Set())
      showToast(`${count}개 일정을 가져왔습니다.`, 'success')
    } catch (err) {
      showToast(`가져오기 실패: ${err.message}`, 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const toggleImportEvent = (id) => {
    setCalImportSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const stats = useMemo(() => {
    const activeCases = cases.filter((c) => c.status === '\uC9C4\uD589' || c.status === '\uC811\uC218')
    const activeConsults = consultations.filter((c) => c.status === '\uC9C4\uD589' || c.status === '\uC811\uC218')
    const thisWeekHearings = cases.filter((c) => {
      const d = getDday(c.nextHearingDate)
      return d !== null && d >= 0 && d <= 7 && c.status !== '\uC885\uACB0'
    })
    const urgentDeadlines = consultations.filter((c) => {
      const d = getDday(c.deadline)
      return d !== null && d >= 0 && d <= 7 && c.status !== '\uC644\uB8CC'
    })
    return {
      activeCases: activeCases.length,
      activeConsults: activeConsults.length,
      thisWeekHearings: thisWeekHearings.length,
      urgentDeadlines: urgentDeadlines.length,
    }
  }, [cases, consultations])

  // 브리핑 데이터
  const briefing = useMemo(() => {
    // 오늘 기일
    const todayHearings = []
    cases.forEach((c) => {
      if (c.nextHearingDate && isToday(c.nextHearingDate) && c.status !== '종결') {
        todayHearings.push({
          time: formatTime(c.nextHearingDate),
          label: `[${c.caseNumber || '번호 미정'}] ${c.clientName}`,
          sub: c.court || '',
          caseId: c.id,
          category: 'case',
        })
      }
    })
    schedules.forEach((s) => {
      if (isToday(s.datetime)) {
        todayHearings.push({
          time: s.allDay ? null : formatTime(s.datetime),
          label: `[${s.type}] ${s.title}`,
          sub: s.location || '',
          scheduleId: s.id,
          category: 'schedule',
        })
      }
    })
    todayHearings.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))

    // 이번 주 마감
    const weekDeadlines = []
    consultations.forEach((c) => {
      if (c.deadline && isThisWeek(c.deadline) && c.status !== '완료') {
        weekDeadlines.push({
          dday: getDday(c.deadline),
          label: `${c.clientName} — ${c.subject || c.type}`,
          caseId: c.id,
        })
      }
    })
    // 이번 주 기일 (오늘 제외)
    cases.forEach((c) => {
      if (c.nextHearingDate && !isToday(c.nextHearingDate) && isThisWeek(c.nextHearingDate) && c.status !== '종결') {
        weekDeadlines.push({
          dday: getDday(c.nextHearingDate),
          label: `[${c.caseNumber || '번호 미정'}] ${c.clientName} 기일`,
          caseId: c.id,
          isHearing: true,
        })
      }
    })
    weekDeadlines.sort((a, b) => a.dday - b.dday)

    // 미수금
    const unpaidInvoices = billingData.invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (i.total || 0), 0)

    return { todayHearings, weekDeadlines, unpaidCount: unpaidInvoices.length, unpaidTotal }
  }, [cases, consultations, schedules, billingData])

  // 빌링 통계
  const billingStats = useMemo(() => {
    const unpaidInvoices = billingData.invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (i.total || 0), 0)

    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const monthlyPaid = billingData.retainers.reduce((s, r) => {
      let amt = 0
      if (r.retainerPaidAt) {
        const d = new Date(r.retainerPaidAt)
        if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) amt += (r.retainerPaid || 0)
      }
      if (r.contingencyPaidAt) {
        const d = new Date(r.contingencyPaidAt)
        if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) amt += (r.contingencyPaid || 0)
      }
      return s + amt
    }, 0)

    return { unpaidCount: unpaidInvoices.length, unpaidTotal, monthlyPaid }
  }, [billingData])

  const calendarEvents = useMemo(() => {
    const events = []
    cases.forEach((c) => {
      if (c.nextHearingDate && c.status !== '\uC885\uACB0') {
        events.push({
          type: 'hearing',
          label: `[${c.caseNumber || '\uBC88\uD638 \uBBF8\uC815'}] ${c.clientName}`,
          date: c.nextHearingDate,
          time: formatTime(c.nextHearingDate),
          caseId: c.id,
          dday: getDday(c.nextHearingDate),
        })
      }
    })
    consultations.forEach((c) => {
      if (c.deadline && c.status !== '\uC644\uB8CC') {
        events.push({
          type: 'deadline',
          label: `[\uC790\uBB38] ${c.clientName} \u2014 ${c.subject || c.type}`,
          date: c.deadline,
          time: null,
          caseId: c.id,
          dday: getDday(c.deadline),
        })
      }
    })
    schedules.forEach((s) => {
      events.push({
        type: 'schedule',
        label: `[${s.type}] ${s.title}`,
        date: s.datetime,
        time: s.allDay ? null : formatTime(s.datetime),
        scheduleId: s.id,
        dday: getDday(s.datetime),
      })
    })
    return events
  }, [cases, consultations, schedules])

  const sortedEvents = useMemo(() => {
    return [...calendarEvents].sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [calendarEvents])

  const recentActivity = useMemo(() => {
    const all = [
      ...cases.map((c) => ({ ...c, _category: 'case' })),
      ...consultations.map((c) => ({ ...c, _category: 'consultation' })),
    ]
    return all
      .filter((item) => item.lastActivityAt)
      .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt))
      .slice(0, 5)
  }, [cases, consultations])

  const isSearching = searchQuery.trim().length > 0
  const unifiedSearchResults = useMemo(() => {
    if (!isSearching) return []
    const q = searchQuery.toLowerCase()
    const results = []
    for (const c of cases) {
      if (matchesQuery(c, q)) results.push({ ...c, _category: 'case' })
    }
    for (const c of consultations) {
      if (matchesQuery(c, q)) results.push({ ...c, _category: 'consultation' })
    }
    return results.sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0))
  }, [cases, consultations, searchQuery, isSearching])

  function navigateToItem(item) {
    if (item._category === 'consultation' || item.category === 'consultation') {
      navigate(`/consultation/${item.id}`)
    } else {
      navigate(`/case/${item.id}`)
    }
  }

  function DdayBadge({ dday, type }) {
    if (dday === null) return <Badge color="gray" variant="light" ff="monospace" size="sm">-</Badge>
    const label = dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`
    const color = dday < 0 ? 'gray' : dday === 0 ? 'red' : dday <= 7 ? 'red' : type === 'hearing' ? 'indigo' : type === 'schedule' ? 'blue' : 'orange'
    const variant = dday === 0 ? 'filled' : 'light'
    return <Badge color={color} variant={variant} ff="monospace" size="sm" miw={56}>{label}</Badge>
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        {/* \uD1B5\uD569 \uAC80\uC0C9 */}
        <TextInput
          placeholder={'\uC0AC\uAC74 + \uC790\uBB38 \uD1B5\uD569 \uAC80\uC0C9 (\uC758\uB8B0\uC778\uBA85, \uC0AC\uAC74\uBC88\uD638, \uD0DC\uADF8...)'}
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />

        {/* 오늘의 브리핑 (검색 중이 아닐 때만) */}
        {!isSearching && (
          <Card padding="md" style={{ borderLeft: '4px solid var(--mantine-color-indigo-5)' }}>
            <Group gap="xs" mb="sm">
              <IconSun size={18} color="var(--mantine-color-yellow-6)" />
              <Text size="sm" fw={700}>오늘의 브리핑</Text>
              <Text size="xs" c="dimmed">
                {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              </Text>
            </Group>

            {briefing.todayHearings.length === 0 && briefing.weekDeadlines.length === 0 && briefing.unpaidCount === 0 ? (
              <Text size="sm" c="dimmed" py="xs">오늘은 여유로운 하루입니다.</Text>
            ) : (
              <Stack gap="sm">
                {/* 오늘 기일 */}
                {briefing.todayHearings.length > 0 && (
                  <div>
                    <Group gap={6} mb={4}>
                      <IconCalendarEvent size={14} color="var(--mantine-color-red-6)" />
                      <Text size="xs" fw={600} c="red">오늘 기일 {briefing.todayHearings.length}건</Text>
                    </Group>
                    <Stack gap={2} ml={20}>
                      {briefing.todayHearings.map((h, i) => (
                        <UnstyledButton
                          key={i}
                          onClick={() => {
                            if (h.category === 'schedule') {
                              const s = schedules.find((x) => x.id === h.scheduleId)
                              if (s) { setEditingSchedule(s); setScheduleModalOpen(true) }
                            } else {
                              navigate(`/case/${h.caseId}`)
                            }
                          }}
                          style={{ borderRadius: 6 }}
                          p={4}
                        >
                          <Group gap="xs" wrap="nowrap">
                            {h.time && <Text size="xs" fw={600} ff="monospace" c="red" miw={40}>{h.time}</Text>}
                            <Text size="sm" truncate>{h.label}</Text>
                            {h.sub && <Text size="xs" c="dimmed">{h.sub}</Text>}
                          </Group>
                        </UnstyledButton>
                      ))}
                    </Stack>
                  </div>
                )}

                {/* 이번 주 마감 */}
                {briefing.weekDeadlines.length > 0 && (
                  <div>
                    <Group gap={6} mb={4}>
                      <IconClock size={14} color="var(--mantine-color-orange-6)" />
                      <Text size="xs" fw={600} c="orange">이번 주 {briefing.weekDeadlines.length}건</Text>
                    </Group>
                    <Stack gap={2} ml={20}>
                      {briefing.weekDeadlines.map((d, i) => (
                        <UnstyledButton
                          key={i}
                          onClick={() => {
                            if (d.isHearing) navigate(`/case/${d.caseId}`)
                            else navigate(`/consultation/${d.caseId}`)
                          }}
                          style={{ borderRadius: 6 }}
                          p={4}
                        >
                          <Group gap="xs" wrap="nowrap">
                            <Badge
                              size="xs" variant="light" ff="monospace" miw={40}
                              color={d.dday <= 3 ? 'red' : 'orange'}
                            >
                              D-{d.dday}
                            </Badge>
                            <Text size="sm" truncate>{d.label}</Text>
                          </Group>
                        </UnstyledButton>
                      ))}
                    </Stack>
                  </div>
                )}

                {/* 미수금 */}
                {briefing.unpaidCount > 0 && (
                  <UnstyledButton
                    onClick={() => navigate('/billing')}
                    style={{ borderRadius: 6 }}
                    p={4}
                  >
                    <Group gap={6}>
                      <IconAlertCircle size={14} color="var(--mantine-color-red-6)" />
                      <Text size="xs" fw={600} c="red">
                        미수금 {briefing.unpaidCount}건 · {formatCurrency(briefing.unpaidTotal)}
                      </Text>
                      <IconArrowRight size={12} color="var(--mantine-color-dimmed)" />
                    </Group>
                  </UnstyledButton>
                )}
              </Stack>
            )}
          </Card>
        )}

        {isSearching ? (
          <>
            <Text size="sm" c="dimmed">
              {'\uAC80\uC0C9 \uACB0\uACFC'} <Text span fw={600}>{unifiedSearchResults.length}</Text>{'\uAC74'}
              {searchQuery.trim() && (
                <Text span c="indigo"> &quot;{searchQuery.trim()}&quot;</Text>
              )}
            </Text>

            {unifiedSearchResults.length === 0 ? (
              <Stack align="center" py="xl" gap="xs">
                <Text c="dimmed">{'\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}</Text>
              </Stack>
            ) : (
              <Stack gap="sm">
                {unifiedSearchResults.map((item) => {
                  const isConsult = item._category === 'consultation'
                  return (
                    <Card
                      key={item.id}
                      padding="md"
                      onClick={() => navigateToItem(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon
                          size={32}
                          radius="xl"
                          variant="light"
                          color={isConsult ? 'grape' : 'indigo'}
                        >
                          {isConsult ? <IconFileText size={16} /> : <IconScale size={16} />}
                        </ThemeIcon>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" mb={2}>
                            <Badge
                              size="xs"
                              variant="light"
                              color={isConsult ? 'grape' : 'indigo'}
                            >
                              {isConsult ? '\uC790\uBB38' : '\uC0AC\uAC74'}
                            </Badge>
                            <Text size="sm" fw={600} truncate>{item.clientName}</Text>
                            <Badge
                              size="xs"
                              variant="light"
                              color={
                                item.status === '\uC9C4\uD589' ? 'blue' :
                                item.status === '\uC811\uC218' ? 'teal' :
                                item.status === '\uC885\uACB0' || item.status === '\uC644\uB8CC' ? 'gray' :
                                'orange'
                              }
                            >
                              {item.status}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed" truncate>
                            {!isConsult && item.caseNumber && `${item.caseNumber} | `}
                            {!isConsult && item.court && `${item.court} | `}
                            {isConsult && item.type && `${item.type} | `}
                            {isConsult && item.subject && `${item.subject} | `}
                            {item.tags?.length > 0 && item.tags.join(', ')}
                          </Text>
                        </Box>
                        <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                          {formatRelativeTime(item.lastActivityAt)}
                        </Text>
                      </Group>
                    </Card>
                  )
                })}
              </Stack>
            )}
          </>
        ) : (
        <>
        {/* 통계 카드 */}
        <SimpleGrid cols={{ base: 2, md: 3 }} spacing="md">
          <Card padding="md" style={{ cursor: 'pointer' }} onClick={() => navigate('/cases')}>
            <Text size="xs" c="dimmed" mb={4}>진행중 사건</Text>
            <Group gap={4} align="baseline">
              <Text size="xl" fw={700} c="indigo">{stats.activeCases}</Text>
              <Text size="sm" c="dimmed">건</Text>
            </Group>
          </Card>
          <Card padding="md" style={{ cursor: 'pointer' }} onClick={() => navigate('/cases')}>
            <Text size="xs" c="dimmed" mb={4}>이번주 기일</Text>
            <Group gap={4} align="baseline">
              <Text size="xl" fw={700} c={stats.thisWeekHearings > 0 ? 'red' : undefined}>{stats.thisWeekHearings}</Text>
              <Text size="sm" c="dimmed">건</Text>
            </Group>
          </Card>
          <Card padding="md" style={{ cursor: 'pointer' }} onClick={() => navigate('/consultations')}>
            <Text size="xs" c="dimmed" mb={4}>진행중 자문</Text>
            <Group gap={4} align="baseline">
              <Text size="xl" fw={700} c="indigo">{stats.activeConsults}</Text>
              <Text size="sm" c="dimmed">건</Text>
            </Group>
          </Card>
          <Card padding="md" style={{ cursor: 'pointer' }} onClick={() => navigate('/billing')}>
            <Group gap={4} mb={4}>
              <IconAlertCircle size={14} color={billingStats.unpaidTotal > 0 ? 'var(--mantine-color-red-6)' : 'var(--mantine-color-green-6)'} />
              <Text size="xs" c="dimmed">미수금</Text>
            </Group>
            <Text size="xl" fw={700} c={billingStats.unpaidTotal > 0 ? 'red' : 'green'}>
              {formatCurrency(billingStats.unpaidTotal)}
            </Text>
            {billingStats.unpaidCount > 0 && (
              <Text size="xs" c="dimmed">{billingStats.unpaidCount}건 미입금</Text>
            )}
          </Card>
          <Card padding="md" style={{ cursor: 'pointer' }} onClick={() => navigate('/billing')}>
            <Group gap={4} mb={4}>
              <IconCash size={14} color="var(--mantine-color-teal-6)" />
              <Text size="xs" c="dimmed">이번달 입금</Text>
            </Group>
            <Text size="xl" fw={700} c="teal">
              {formatCurrency(billingStats.monthlyPaid)}
            </Text>
          </Card>
          <Card padding="md" style={{ cursor: 'pointer' }} onClick={() => navigate('/consultations')}>
            <Text size="xs" c="dimmed" mb={4}>마감 임박 자문</Text>
            <Group gap={4} align="baseline">
              <Text size="xl" fw={700} c={stats.urgentDeadlines > 0 ? 'orange' : undefined}>{stats.urgentDeadlines}</Text>
              <Text size="sm" c="dimmed">건</Text>
            </Group>
          </Card>
        </SimpleGrid>

        {/* \uCE98\uB9B0\uB354 + \uC77C\uC815 */}
        <Box style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 'var(--mantine-spacing-md)',
        }}
          className="dashboard-calendar-grid"
        >
          <style>{`
            @media (min-width: 62em) {
              .dashboard-calendar-grid {
                grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) !important;
              }
            }
          `}</style>
          <MiniCalendar
            events={calendarEvents}
            onEventClick={(ev) => {
              if (ev.type === 'schedule') {
                const s = schedules.find((x) => x.id === ev.scheduleId)
                if (s) { setEditingSchedule(s); setScheduleModalOpen(true) }
                return
              }
              if (!ev.caseId) return
              if (ev.type === 'deadline') {
                navigate(`/consultation/${ev.caseId}`)
              } else {
                navigate(`/case/${ev.caseId}`)
              }
            }}
          />
          <Card padding="md">
            <Group justify="space-between" mb="sm">
              <Text size="sm" fw={600}>
                {'\uC77C\uC815'} ({sortedEvents.length})
              </Text>
              <Group gap={4}>
                <ActionIcon
                  variant="light"
                  color="teal"
                  size="sm"
                  onClick={handleFetchCalendarEvents}
                  loading={isImporting}
                  title="캘린더에서 가져오기"
                >
                  <IconCalendarEvent size={14} />
                </ActionIcon>
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="sm"
                  onClick={() => { setEditingSchedule(null); setScheduleModalOpen(true) }}
                  title="일정 추가"
                >
                  <IconPlus size={14} />
                </ActionIcon>
              </Group>
            </Group>
            {/* 캘린더 가져오기 패널 */}
            {calImportEvents !== null && calImportEvents.length > 0 && (
              <Alert color="teal" radius="md" mb="sm">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={600}>
                    캘린더에서 {calImportEvents.length}개 일정 발견
                  </Text>
                  <Group gap="xs">
                    <Button variant="subtle" size="xs" onClick={() => { setCalImportEvents(null); setCalImportSelected(new Set()) }}>
                      닫기
                    </Button>
                    <Button
                      color="teal" size="xs"
                      onClick={handleImportSelected}
                      loading={isImporting}
                      disabled={calImportSelected.size === 0}
                    >
                      선택 가져오기 ({calImportSelected.size})
                    </Button>
                  </Group>
                </Group>
                <Stack gap={4} mah={200} style={{ overflowY: 'auto' }}>
                  {calImportEvents.map((ev) => (
                    <Group key={ev.id} gap="sm" wrap="nowrap">
                      <Checkbox
                        size="xs"
                        checked={calImportSelected.has(ev.id)}
                        onChange={() => toggleImportEvent(ev.id)}
                      />
                      <Text size="xs" c="dimmed" ff="monospace" style={{ flexShrink: 0 }}>
                        {formatDate(ev.datetime)}{formatTime(ev.datetime) ? ` ${formatTime(ev.datetime)}` : ''}
                      </Text>
                      <Text size="sm" truncate style={{ flex: 1 }}>{ev.summary}</Text>
                    </Group>
                  ))}
                </Stack>
              </Alert>
            )}

            {calImportEvents !== null && calImportEvents.length === 0 && (
              <Alert color="teal" radius="md" mb="sm">
                <Group justify="space-between">
                  <Text size="sm">가져올 새 일정이 없습니다.</Text>
                  <Button variant="subtle" size="xs" onClick={() => setCalImportEvents(null)}>닫기</Button>
                </Group>
              </Alert>
            )}

            {sortedEvents.length === 0 && calImportEvents === null ? (
              <Text size="sm" c="dimmed" py="lg">{'\uB4F1\uB85D\uB41C \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'}</Text>
            ) : (
              <Stack gap={4} mah={320} style={{ overflowY: 'auto' }}>
                {sortedEvents.map((ev, i) => {
                  const isPast = ev.dday !== null && ev.dday < 0
                  return (
                    <UnstyledButton
                      key={i}
                      onClick={() => {
                        if (ev.type === 'schedule') {
                          const s = schedules.find((x) => x.id === ev.scheduleId)
                          if (s) { setEditingSchedule(s); setScheduleModalOpen(true) }
                          return
                        }
                        if (!ev.caseId) return
                        if (ev.type === 'deadline') {
                          navigate(`/consultation/${ev.caseId}`)
                        } else {
                          navigate(`/case/${ev.caseId}`)
                        }
                      }}
                      p="xs"
                      style={{ borderRadius: 8, opacity: isPast ? 0.5 : 1 }}
                    >
                      <Group gap="sm" wrap="nowrap">
                        <DdayBadge dday={ev.dday} type={ev.type} />
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" truncate>{ev.label}</Text>
                          <Text size="xs" c="dimmed">
                            {formatDate(ev.date)}{ev.time ? ` ${ev.time}` : ''}
                            {' \u00B7 '}{ev.type === 'hearing' ? '\uAE30\uC77C' : ev.type === 'schedule' ? '\uC77C\uC815' : '\uB9C8\uAC10'}
                          </Text>
                        </Box>
                      </Group>
                    </UnstyledButton>
                  )
                })}
              </Stack>
            )}
          </Card>
        </Box>

        {/* \uCD5C\uADFC \uD65C\uB3D9 */}
        {recentActivity.length > 0 && !isSearching && (
          <Card padding="md">
            <Group justify="space-between" mb="sm">
              <Group gap="xs">
                <IconClock size={16} color="var(--mantine-color-dimmed)" />
                <Text size="sm" fw={600}>{'\uCD5C\uADFC \uD65C\uB3D9'}</Text>
              </Group>
            </Group>
            <Stack gap={4}>
              {recentActivity.map((item) => {
                const isConsult = item._category === 'consultation'
                return (
                  <UnstyledButton
                    key={item.id}
                    onClick={() => navigateToItem(item)}
                    p="xs"
                    style={{ borderRadius: 8 }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      <ThemeIcon
                        size={28}
                        radius="xl"
                        variant="light"
                        color={isConsult ? 'grape' : 'indigo'}
                      >
                        {isConsult ? <IconFileText size={14} /> : <IconScale size={14} />}
                      </ThemeIcon>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs" wrap="nowrap">
                          <Badge
                            size="xs"
                            variant="light"
                            color={isConsult ? 'grape' : 'indigo'}
                          >
                            {isConsult ? '\uC790\uBB38' : '\uC0AC\uAC74'}
                          </Badge>
                          <Text size="sm" fw={500} truncate>{item.clientName}</Text>
                          {!isConsult && item.caseNumber && (
                            <Text size="xs" c="dimmed" truncate ff="monospace">{item.caseNumber}</Text>
                          )}
                          {isConsult && item.subject && (
                            <Text size="xs" c="dimmed" truncate>{item.subject}</Text>
                          )}
                        </Group>
                      </Box>
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        {formatRelativeTime(item.lastActivityAt)}
                      </Text>
                      <IconArrowRight size={14} color="var(--mantine-color-dimmed)" />
                    </Group>
                  </UnstyledButton>
                )
              })}
            </Stack>
          </Card>
        )}

        </>
        )}
      </Stack>

      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => { setScheduleModalOpen(false); setEditingSchedule(null) }}
        title={editingSchedule ? '일정 수정' : '일정 추가'}
      >
        <ScheduleForm
          initialData={editingSchedule}
          onSubmit={async (data) => {
            if (editingSchedule) {
              await updateSchedule(editingSchedule.id, data)
            } else {
              await createSchedule(data)
            }
            setScheduleModalOpen(false)
            setEditingSchedule(null)
          }}
          onCancel={() => { setScheduleModalOpen(false); setEditingSchedule(null) }}
          onDelete={editingSchedule ? async (id) => {
            await deleteSchedule(id)
            setScheduleModalOpen(false)
            setEditingSchedule(null)
          } : undefined}
        />
      </Modal>
    </Container>
  )
}
