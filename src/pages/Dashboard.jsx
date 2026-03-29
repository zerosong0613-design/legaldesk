import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Group, Text, Badge, Card,
  SimpleGrid, TextInput, Stack, Box,
  UnstyledButton, Container, ThemeIcon,
} from '@mantine/core'
import {
  IconSearch, IconScale,
  IconFileText, IconClock, IconArrowRight,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import MiniCalendar from '../components/ui/MiniCalendar'

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

export default function Dashboard() {
  const navigate = useNavigate()
  const { cases, consultations } = useCaseStore()
  const { searchQuery, setSearchQuery } = useUiStore()

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
    return events
  }, [cases, consultations])

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
    const color = dday < 0 ? 'gray' : dday === 0 ? 'red' : dday <= 7 ? 'red' : type === 'hearing' ? 'indigo' : 'orange'
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
        {/* \uD1B5\uACC4 \uCE74\uB4DC */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
          <Card padding="md" style={{ cursor: 'pointer' }} onClick={() => navigate('/cases')}>
            <Text size="xs" c="dimmed" mb={4}>{'\uC9C4\uD589\uC911 \uC0AC\uAC74'}</Text>
            <Group gap={4} align="baseline">
              <Text size="xl" fw={700} c="indigo">{stats.activeCases}</Text>
              <Text size="sm" c="dimmed">{'\uAC74'}</Text>
            </Group>
          </Card>
          <Card padding="md" style={{ cursor: 'pointer' }} onClick={() => navigate('/cases')}>
            <Text size="xs" c="dimmed" mb={4}>{'\uC774\uBC88\uC8FC \uAE30\uC77C'}</Text>
            <Group gap={4} align="baseline">
              <Text size="xl" fw={700} c={stats.thisWeekHearings > 0 ? 'red' : undefined}>{stats.thisWeekHearings}</Text>
              <Text size="sm" c="dimmed">{'\uAC74'}</Text>
            </Group>
          </Card>
          <Card padding="md" style={{ cursor: 'pointer' }} onClick={() => navigate('/consultations')}>
            <Text size="xs" c="dimmed" mb={4}>{'\uB9C8\uAC10 \uC784\uBC15 \uC790\uBB38'}</Text>
            <Group gap={4} align="baseline">
              <Text size="xl" fw={700} c={stats.urgentDeadlines > 0 ? 'orange' : undefined}>{stats.urgentDeadlines}</Text>
              <Text size="sm" c="dimmed">{'\uAC74'}</Text>
            </Group>
          </Card>
          <Card padding="md" style={{ cursor: 'pointer' }} onClick={() => navigate('/consultations')}>
            <Text size="xs" c="dimmed" mb={4}>{'\uC9C4\uD589\uC911 \uC790\uBB38'}</Text>
            <Group gap={4} align="baseline">
              <Text size="xl" fw={700} c="indigo">{stats.activeConsults}</Text>
              <Text size="sm" c="dimmed">{'\uAC74'}</Text>
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
              if (!ev.caseId) return
              if (ev.type === 'deadline') {
                navigate(`/consultation/${ev.caseId}`)
              } else {
                navigate(`/case/${ev.caseId}`)
              }
            }}
          />
          <Card padding="md">
            <Text size="sm" fw={600} mb="sm">
              {'\uC77C\uC815'} ({sortedEvents.length})
            </Text>
            {sortedEvents.length === 0 ? (
              <Text size="sm" c="dimmed" py="lg">{'\uB4F1\uB85D\uB41C \uC77C\uC815\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'}</Text>
            ) : (
              <Stack gap={4} mah={320} style={{ overflowY: 'auto' }}>
                {sortedEvents.map((ev, i) => {
                  const isPast = ev.dday !== null && ev.dday < 0
                  return (
                    <UnstyledButton
                      key={i}
                      onClick={() => {
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
                            {' \u00B7 '}{ev.type === 'hearing' ? '\uAE30\uC77C' : '\uB9C8\uAC10'}
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
    </Container>
  )
}
