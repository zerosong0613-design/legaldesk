import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppShell, Group, Title, Text, Button, Avatar, Badge, Card,
  SimpleGrid, TextInput, SegmentedControl, Stack, Box, Alert,
  UnstyledButton, Container, ThemeIcon,
} from '@mantine/core'
import {
  IconSearch, IconPlus, IconLogout, IconScale,
  IconFileText, IconClock, IconArrowRight, IconReceipt,
  IconUsers, IconBuilding,
} from '@tabler/icons-react'
import { useAuthStore } from '../auth/useAuth'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import CaseCard from '../components/case/CaseCard'
import ConsultationCard from '../components/case/ConsultationCard'
import CaseForm from '../components/case/CaseForm'
import ConsultationForm from '../components/case/ConsultationForm'
import Modal from '../components/ui/Modal'
import MiniCalendar from '../components/ui/MiniCalendar'
import Toast from '../components/ui/Toast'

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

const CASE_STATUS_FILTERS = [
  { label: '\uC804\uCCB4', value: null },
  { label: '\uC811\uC218', value: '\uC811\uC218' },
  { label: '\uC9C4\uD589', value: '\uC9C4\uD589' },
  { label: '\uC885\uACB0', value: '\uC885\uACB0' },
  { label: '\uBCF4\uB958', value: '\uBCF4\uB958' },
]

const CONSULT_STATUS_FILTERS = [
  { label: '\uC804\uCCB4', value: null },
  { label: '\uC811\uC218', value: '\uC811\uC218' },
  { label: '\uC9C4\uD589', value: '\uC9C4\uD589' },
  { label: '\uC644\uB8CC', value: '\uC644\uB8CC' },
  { label: '\uBCF4\uB958', value: '\uBCF4\uB958' },
]

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
  const { user, logout } = useAuthStore()
  const {
    cases, consultations,
    createCase, updateCase, deleteCase,
    createConsultation, updateConsultation, deleteConsultation,
    error: storeError,
    workspace,
  } = useCaseStore()
  const {
    dashboardTab, setDashboardTab,
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    isModalOpen, modalType, modalData,
    openModal, closeModal, showToast,
  } = useUiStore()

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

  // ─── 최근 활동: 사건+자문 통합, lastActivityAt 기준 최신 5개 ───
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

  // ─── 통합 검색: 검색어 있으면 사건+자문 모두 검색 ───
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

  // ─── 탭별 필터 (검색 중 아닐 때) ───
  const statusFilters = dashboardTab === 'cases' ? CASE_STATUS_FILTERS : CONSULT_STATUS_FILTERS
  const items = dashboardTab === 'cases' ? cases : consultations

  const filteredItems = useMemo(() => {
    let result = items
    if (statusFilter) result = result.filter((c) => c.status === statusFilter)
    return result.sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0))
  }, [items, statusFilter])

  function navigateToItem(item) {
    if (item._category === 'consultation' || item.category === 'consultation') {
      navigate(`/consultation/${item.id}`)
    } else {
      navigate(`/case/${item.id}`)
    }
  }

  const handleCreateCase = async (data) => {
    const result = await createCase(data)
    if (result) { closeModal(); showToast('\uC0AC\uAC74\uC774 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success') }
  }
  const handleEditCase = async (data) => {
    await updateCase(modalData.id, data)
    closeModal(); showToast('\uC0AC\uAC74\uC774 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
  }
  const handleCreateConsultation = async (data) => {
    const result = await createConsultation(data)
    if (result) { closeModal(); showToast('\uC790\uBB38\uC774 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success') }
  }
  const handleEditConsultation = async (data) => {
    await updateConsultation(modalData.id, data)
    closeModal(); showToast('\uC790\uBB38\uC774 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
  }
  const handleDelete = async () => {
    if (modalData.category === 'consultation') {
      await deleteConsultation(modalData.id)
      showToast('\uC790\uBB38\uC774 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    } else {
      await deleteCase(modalData.id)
      showToast('\uC0AC\uAC74\uC774 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    }
    closeModal()
  }

  function DdayBadge({ dday, type }) {
    if (dday === null) return <Badge color="gray" variant="light" ff="monospace" size="sm">-</Badge>
    const label = dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`
    const color = dday < 0 ? 'gray' : dday === 0 ? 'red' : dday <= 7 ? 'red' : type === 'hearing' ? 'indigo' : 'orange'
    const variant = dday === 0 ? 'filled' : 'light'
    return <Badge color={color} variant={variant} ff="monospace" size="sm" miw={56}>{label}</Badge>
  }

  return (
    <AppShell header={{ height: 56 }} bg="#f0f2f5">
      <AppShell.Header bg="#1d2124" style={{ borderBottom: 'none' }}>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between">
            <UnstyledButton onClick={() => navigate('/')}>
              <Title order={4} c="white" ff="'Noto Serif KR', serif">LegalDesk</Title>
            </UnstyledButton>
            <Group gap="sm">
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconReceipt size={14} />}
                onClick={() => navigate('/billing')}
                styles={{ root: { color: 'var(--mantine-color-gray-4)' } }}
              >
                {'\uBE44\uC6A9\uAD00\uB9AC'}
              </Button>
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={workspace?.type === 'shared' ? <IconBuilding size={14} /> : <IconUsers size={14} />}
                onClick={() => navigate('/workspace')}
                styles={{ root: { color: workspace?.type === 'shared' ? 'var(--mantine-color-teal-4)' : 'var(--mantine-color-gray-4)' } }}
              >
                {workspace?.type === 'shared' ? (workspace.label || '\uACF5\uC720') : '\uC791\uC5C5\uACF5\uAC04'}
              </Button>
              {user?.picture && <Avatar src={user.picture} size="sm" radius="xl" />}
              <Text size="sm" c="gray.4" visibleFrom="sm">{user?.name}</Text>
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconLogout size={14} />}
                onClick={logout}
                styles={{ root: { color: 'var(--mantine-color-gray-5)' } }}
              >
                {'\uB85C\uADF8\uC544\uC6C3'}
              </Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl" py="lg">
          <Stack gap="lg">
            {/* 통계 카드 */}
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
              <Card padding="md">
                <Text size="xs" c="dimmed" mb={4}>{'\uC9C4\uD589\uC911 \uC0AC\uAC74'}</Text>
                <Group gap={4} align="baseline">
                  <Text size="xl" fw={700}>{stats.activeCases}</Text>
                  <Text size="sm" c="dimmed">{'\uAC74'}</Text>
                </Group>
              </Card>
              <Card padding="md">
                <Text size="xs" c="dimmed" mb={4}>{'\uC774\uBC88\uC8FC \uAE30\uC77C'}</Text>
                <Group gap={4} align="baseline">
                  <Text size="xl" fw={700} c={stats.thisWeekHearings > 0 ? 'red' : undefined}>{stats.thisWeekHearings}</Text>
                  <Text size="sm" c="dimmed">{'\uAC74'}</Text>
                </Group>
              </Card>
              <Card padding="md">
                <Text size="xs" c="dimmed" mb={4}>{'\uB9C8\uAC10 \uC784\uBC15 \uC790\uBB38'}</Text>
                <Group gap={4} align="baseline">
                  <Text size="xl" fw={700} c={stats.urgentDeadlines > 0 ? 'orange' : undefined}>{stats.urgentDeadlines}</Text>
                  <Text size="sm" c="dimmed">{'\uAC74'}</Text>
                </Group>
              </Card>
              <Card padding="md">
                <Text size="xs" c="dimmed" mb={4}>{'\uC9C4\uD589\uC911 \uC790\uBB38'}</Text>
                <Group gap={4} align="baseline">
                  <Text size="xl" fw={700}>{stats.activeConsults}</Text>
                  <Text size="sm" c="dimmed">{'\uAC74'}</Text>
                </Group>
              </Card>
            </SimpleGrid>

            {/* 캘린더 + 일정 */}
            <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
              <Box>
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
              </Box>
              <Box style={{ gridColumn: 'span 2' }}>
                <Card padding="md" h="100%">
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
            </SimpleGrid>

            {/* ─── 최근 활동 ─── */}
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

            {/* ─── 통합 검색 바 ─── */}
            <Group gap="sm" wrap="wrap">
              {!isSearching && (
                <SegmentedControl
                  value={dashboardTab}
                  onChange={setDashboardTab}
                  data={[
                    { label: `\uC0AC\uAC74 (${cases.length})`, value: 'cases' },
                    { label: `\uC790\uBB38 (${consultations.length})`, value: 'consultations' },
                  ]}
                />
              )}
              <TextInput
                placeholder={isSearching ? '\uC0AC\uAC74 + \uC790\uBB38 \uD1B5\uD569 \uAC80\uC0C9...' : (dashboardTab === 'cases' ? '\uC758\uB8B0\uC778\uBA85, \uC0AC\uAC74\uBC88\uD638, \uD0DC\uADF8...' : '\uC758\uB8B0\uC778\uBA85, \uC8FC\uC81C, \uD0DC\uADF8...')}
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              {isSearching ? (
                <Button variant="default" onClick={() => setSearchQuery('')}>{'\uAC80\uC0C9 \uCDE8\uC18C'}</Button>
              ) : (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => openModal(dashboardTab === 'cases' ? 'createCase' : 'createConsultation')}
                >
                  {dashboardTab === 'cases' ? '\uC0C8 \uC0AC\uAC74' : '\uC0C8 \uC790\uBB38'}
                </Button>
              )}
            </Group>

            {/* ─── 통합 검색 결과 ─── */}
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
                {/* 상태 필터 */}
                <Group gap="xs">
                  {statusFilters.map((f) => (
                    <Button
                      key={f.label}
                      variant={statusFilter === f.value ? 'filled' : 'default'}
                      size="xs"
                      onClick={() => setStatusFilter(f.value)}
                    >
                      {f.label}
                      {f.value === null && ` (${items.length})`}
                      {f.value && ` (${items.filter((c) => c.status === f.value).length})`}
                    </Button>
                  ))}
                </Group>

                {/* 에러 */}
                {storeError && <Alert color="red">{storeError}</Alert>}

                {/* 카드 목록 */}
                {filteredItems.length === 0 ? (
                  <Stack align="center" py="xl" gap="xs">
                    <Text c="dimmed">
                      {items.length === 0
                        ? dashboardTab === 'cases' ? '\uC544\uC9C1 \uB4F1\uB85D\uB41C \uC0AC\uAC74\uC774 \uC5C6\uC2B5\uB2C8\uB2E4' : '\uC544\uC9C1 \uB4F1\uB85D\uB41C \uC790\uBB38\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'
                        : '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}
                    </Text>
                    {items.length === 0 && (
                      <Button
                        variant="subtle"
                        onClick={() => openModal(dashboardTab === 'cases' ? 'createCase' : 'createConsultation')}
                      >
                        {dashboardTab === 'cases' ? '\uCCAB \uBC88\uC9F8 \uC0AC\uAC74 \uB4F1\uB85D\uD558\uAE30' : '\uCCAB \uBC88\uC9F8 \uC790\uBB38 \uB4F1\uB85D\uD558\uAE30'}
                      </Button>
                    )}
                  </Stack>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                    {dashboardTab === 'cases'
                      ? filteredItems.map((c) => (
                          <CaseCard
                            key={c.id}
                            caseData={c}
                            onClick={() => navigate(`/case/${c.id}`)}
                            onEdit={(data) => openModal('editCase', data)}
                            onDelete={(data) => openModal('deleteConfirm', { ...data, category: 'case' })}
                          />
                        ))
                      : filteredItems.map((c) => (
                          <ConsultationCard
                            key={c.id}
                            data={c}
                            onClick={() => navigate(`/consultation/${c.id}`)}
                            onEdit={(data) => openModal('editConsultation', data)}
                            onDelete={(data) => openModal('deleteConfirm', { ...data, category: 'consultation' })}
                          />
                        ))}
                  </SimpleGrid>
                )}
              </>
            )}
          </Stack>
        </Container>
      </AppShell.Main>

      {/* 모달들 */}
      <Modal isOpen={isModalOpen && modalType === 'createCase'} onClose={closeModal} title={'\uC0C8 \uC0AC\uAC74 \uB4F1\uB85D'}>
        <CaseForm onSubmit={handleCreateCase} onCancel={closeModal} />
      </Modal>
      <Modal isOpen={isModalOpen && modalType === 'editCase'} onClose={closeModal} title={'\uC0AC\uAC74 \uC218\uC815'}>
        <CaseForm initialData={modalData} onSubmit={handleEditCase} onCancel={closeModal} />
      </Modal>
      <Modal isOpen={isModalOpen && modalType === 'createConsultation'} onClose={closeModal} title={'\uC0C8 \uC790\uBB38 \uB4F1\uB85D'}>
        <ConsultationForm onSubmit={handleCreateConsultation} onCancel={closeModal} />
      </Modal>
      <Modal isOpen={isModalOpen && modalType === 'editConsultation'} onClose={closeModal} title={'\uC790\uBB38 \uC218\uC815'}>
        <ConsultationForm initialData={modalData} onSubmit={handleEditConsultation} onCancel={closeModal} />
      </Modal>
      <Modal isOpen={isModalOpen && modalType === 'deleteConfirm'} onClose={closeModal} title={'\uC0AD\uC81C \uD655\uC778'}>
        <Stack>
          <Text size="sm" c="dimmed">
            <Text span fw={600}>{modalData?.clientName}</Text>
            {modalData?.caseNumber && ` (${modalData.caseNumber})`}
            {modalData?.subject && ` \u2014 ${modalData.subject}`}
            {'\uC744(\uB97C) \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'}
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={closeModal}>{'\uCDE8\uC18C'}</Button>
            <Button color="red" onClick={handleDelete}>{'\uC0AD\uC81C'}</Button>
          </Group>
        </Stack>
      </Modal>

      <Toast />
    </AppShell>
  )
}
