import { useState } from 'react'
import {
  Card, Group, Text, Button, Badge, ActionIcon, Stack, TextInput, Select,
  SimpleGrid, Paper, Alert, Box,
} from '@mantine/core'
import { IconCalendarPlus, IconCalendarEvent, IconX, IconMapPin, IconPin } from '@tabler/icons-react'
import { useCaseStore } from '../../store/caseStore'
import { useUiStore } from '../../store/uiStore'
import { createCalendarEvent, deleteCalendarEvent, fetchCalendarEvents, matchEventsToCaseNumber } from '../../api/calendar'
import { readCaseDetail, writeCaseDetail } from '../../api/drive'
import { formatDateWithDay, parseCalendarTitle } from '../../utils/dateUtils'

const HEARING_TYPES_CIVIL = ['변론', '조정', '선고', '증인신문', '감정', '기타']
const HEARING_TYPES_CRIMINAL = ['공판', '경찰 조사', '검찰 조사', '영장실질심사', '변론', '선고', '기타']

function getDday(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `D+${Math.abs(diff)}`
  if (diff === 0) return 'D-Day'
  return `D-${diff}`
}

function getDdayColor(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'gray'
  if (diff === 0) return 'red'
  if (diff <= 7) return 'red'
  return 'indigo'
}

function getDdayVariant(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  return diff === 0 ? 'filled' : 'light'
}

function formatDateTime(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getHearingDisplay(hearing) {
  if (hearing.note && hearing.note.startsWith('[\uCE98\uB9B0\uB354 \uAC00\uC838\uC624\uAE30]')) {
    const parsed = parseCalendarTitle(hearing.note.replace(/^\[.+?\]\s*/, ''))
    return {
      type: parsed.type || hearing.type,
      court: hearing.court || '',
      room: parsed.location || hearing.room || '',
      note: '',
    }
  }
  return { type: hearing.type, court: hearing.court, room: hearing.room, note: hearing.note }
}

export default function HearingList({ caseData }) {
  const { loadCaseDetail, updateCase } = useCaseStore()
  const { showToast } = useUiStore()
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState(null)
  const isCriminal = caseData.type === '형사'
  const HEARING_TYPES = isCriminal ? HEARING_TYPES_CRIMINAL : HEARING_TYPES_CIVIL
  const defaultType = isCriminal ? '공판' : '변론'
  const [form, setForm] = useState({
    datetime: '', type: defaultType, court: caseData.court || '', room: '', note: '',
  })

  const hearings = [...(caseData.hearings || [])].sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
  const upcomingHearings = hearings.filter((h) => new Date(h.datetime) >= new Date())
  const pastHearings = hearings.filter((h) => new Date(h.datetime) < new Date())

  const handleSyncFromCalendar = async () => {
    if (!caseData.caseNumber) { showToast('\uC0AC\uAC74\uBC88\uD638\uAC00 \uC5C6\uC5B4 \uCE98\uB9B0\uB354 \uB9E4\uCE6D\uC774 \uBD88\uAC00\uD569\uB2C8\uB2E4.', 'error'); return }
    setIsSyncing(true)
    try {
      const now = new Date()
      const timeMin = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      const timeMax = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      const allEvents = await fetchCalendarEvents(timeMin.toISOString(), timeMax.toISOString())
      let matched = matchEventsToCaseNumber(allEvents, caseData.caseNumber)
      if (matched.length === 0 && allEvents.length > 0) {
        matched = allEvents
        showToast(`\uC0AC\uAC74\uBC88\uD638 \uB9E4\uCE6D \uC5C6\uC74C. \uCE98\uB9B0\uB354\uC758 \uBC95\uC6D0 \uC774\uBCA4\uD2B8 ${allEvents.length}\uAC1C\uB97C \uD45C\uC2DC\uD569\uB2C8\uB2E4.`, 'info')
      }
      if (matched.length === 0) { showToast('\uCE98\uB9B0\uB354\uC5D0\uC11C \uBC95\uC6D0 \uAD00\uB828 \uC774\uBCA4\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.', 'info'); setCalendarEvents([]); return }
      const existingEventIds = new Set(hearings.map((h) => h.calendarEventId).filter(Boolean))
      const existingDatetimes = new Set(hearings.map((h) => new Date(h.datetime).getTime()))
      const newEvents = matched.filter((ev) => !existingEventIds.has(ev.calendarEventId) && !existingDatetimes.has(new Date(ev.datetime).getTime()))
      setCalendarEvents(newEvents)
      if (newEvents.length === 0) showToast('\uBAA8\uB4E0 \uAE30\uC77C\uC774 \uC774\uBBF8 \uB4F1\uB85D\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.', 'info')
    } catch (err) { showToast(`\uCE98\uB9B0\uB354 \uC870\uD68C \uC2E4\uD328: ${err.message}`, 'error') }
    finally { setIsSyncing(false) }
  }

  const handleImportEvents = async () => {
    if (!calendarEvents?.length) return
    setIsSyncing(true)
    try {
      const detail = await readCaseDetail(caseData.driveFileId)
      const newHearings = calendarEvents.map((ev) => ({
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        datetime: new Date(ev.datetime).toISOString(), type: '\uBCC0\uB860', court: caseData.court || '',
        room: ev.location || '', note: `[\uCE98\uB9B0\uB354 \uAC00\uC838\uC624\uAE30] ${ev.summary}`,
        calendarEventId: ev.calendarEventId, createdAt: new Date().toISOString(),
      }))
      detail.hearings = [...(detail.hearings || []), ...newHearings]
      await writeCaseDetail(caseData.driveFileId, detail)
      const nextHearing = detail.hearings.filter((h) => new Date(h.datetime) >= new Date()).sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]
      if (nextHearing) await updateCase(caseData.id, { nextHearingDate: nextHearing.datetime })
      await loadCaseDetail(caseData.id)
      setCalendarEvents(null)
      showToast(`${newHearings.length}\uAC1C \uAE30\uC77C\uC744 \uAC00\uC838\uC654\uC2B5\uB2C8\uB2E4.`, 'success')
    } catch (err) { showToast(`\uAE30\uC77C \uAC00\uC838\uC624\uAE30 \uC2E4\uD328: ${err.message}`, 'error') }
    finally { setIsSyncing(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.datetime) return
    setIsSubmitting(true)
    try {
      const calEvent = await createCalendarEvent({ ...form, caseNumber: caseData.caseNumber, clientName: caseData.clientName })
      const newHearing = {
        id: `h-${Date.now()}`, datetime: new Date(form.datetime).toISOString(),
        type: form.type, court: form.court, room: form.room, note: form.note,
        calendarEventId: calEvent?.id || null, createdAt: new Date().toISOString(),
      }
      const detail = await readCaseDetail(caseData.driveFileId)
      detail.hearings = [...(detail.hearings || []), newHearing]
      await writeCaseDetail(caseData.driveFileId, detail)
      const nextHearing = detail.hearings.filter((h) => new Date(h.datetime) >= new Date()).sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]
      if (nextHearing) await updateCase(caseData.id, { nextHearingDate: nextHearing.datetime })
      await loadCaseDetail(caseData.id)
      setShowForm(false)
      setForm({ datetime: '', type: defaultType, court: caseData.court || '', room: '', note: '' })
      showToast('\uAE30\uC77C\uC774 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    } catch (err) { showToast(`\uAE30\uC77C \uCD94\uAC00 \uC2E4\uD328: ${err.message}`, 'error') }
    finally { setIsSubmitting(false) }
  }

  const handleDelete = async (hearing) => {
    try {
      if (hearing.calendarEventId) await deleteCalendarEvent(hearing.calendarEventId).catch(() => {})
      const detail = await readCaseDetail(caseData.driveFileId)
      detail.hearings = detail.hearings.filter((h) => h.id !== hearing.id)
      await writeCaseDetail(caseData.driveFileId, detail)
      const nextHearing = detail.hearings.filter((h) => new Date(h.datetime) >= new Date()).sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]
      await updateCase(caseData.id, { nextHearingDate: nextHearing?.datetime || null })
      await loadCaseDetail(caseData.id)
      showToast('\uAE30\uC77C\uC774 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    } catch (err) { showToast(`\uAE30\uC77C \uC0AD\uC81C \uC2E4\uD328: ${err.message}`, 'error') }
  }

  const renderHearing = (hearing, isUpcoming) => {
    const isPast = !isUpcoming
    const display = getHearingDisplay(hearing)

    return (
      <Card
        key={hearing.id}
        padding={0}
        style={{
          opacity: isPast ? 0.6 : 1,
          overflow: 'hidden',
        }}
      >
        {isUpcoming && (
          <Box style={{ height: 3, backgroundColor: 'var(--mantine-color-indigo-6)' }} />
        )}
        <Box p="md">
          <Group justify="space-between" wrap="nowrap" mb="xs">
            <Group gap="xs">
              <Text size="sm" fw={700} c={isPast ? 'dimmed' : undefined}>{display.type}</Text>
              <Badge
                color={getDdayColor(hearing.datetime)}
                variant={getDdayVariant(hearing.datetime)}
                size="sm"
                ff="monospace"
              >
                {getDday(hearing.datetime)}
              </Badge>
              {hearing.calendarEventId && <Text size="xs">📅</Text>}
            </Group>
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => handleDelete(hearing)}>
              <IconX size={14} />
            </ActionIcon>
          </Group>

          <Text size="sm" c={isPast ? 'dimmed' : undefined} ff="monospace" mb="xs">
            {formatDateWithDay(hearing.datetime)}
          </Text>

          {(display.court || display.room) && (
            <Group gap={4} mb="xs">
              <IconMapPin size={13} color="var(--mantine-color-gray-5)" />
              <Text size="sm" c="dimmed">
                {display.court}{display.room && ` \u00B7 ${display.room}`}
              </Text>
            </Group>
          )}

          {display.note && (
            <Alert icon={<IconPin size={14} />} color="indigo" radius="md" p="xs" mt="xs">
              <Text size="xs">{display.note}</Text>
            </Alert>
          )}
        </Box>
      </Card>
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text size="md" fw={600}>{'\uAE30\uC77C \uBAA9\uB85D'}</Text>
        <Group gap="xs">
          <Button
            variant="light" color="teal" size="xs"
            leftSection={<IconCalendarEvent size={14} />}
            onClick={handleSyncFromCalendar}
            loading={isSyncing}
          >
            {'\uCE98\uB9B0\uB354\uC5D0\uC11C \uAC00\uC838\uC624\uAE30'}
          </Button>
          <Button
            variant="light" size="xs"
            leftSection={<IconCalendarPlus size={14} />}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? '\uCDE8\uC18C' : '\uAE30\uC77C \uCD94\uAC00'}
          </Button>
        </Group>
      </Group>

      {calendarEvents !== null && calendarEvents.length > 0 && (
        <Alert color="teal" radius="md">
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={600}>{'\uCE98\uB9B0\uB354\uC5D0\uC11C'} {calendarEvents.length}{'\uAC1C \uAE30\uC77C \uBC1C\uACAC'}</Text>
            <Group gap="xs">
              <Button variant="subtle" size="xs" onClick={() => setCalendarEvents(null)}>{'\uB2EB\uAE30'}</Button>
              <Button color="teal" size="xs" onClick={handleImportEvents} loading={isSyncing}>{'\uC804\uBD80 \uAC00\uC838\uC624\uAE30'}</Button>
            </Group>
          </Group>
          <Stack gap={4} mah={160} style={{ overflowY: 'auto' }}>
            {calendarEvents.map((ev) => (
              <Group key={ev.id} gap="sm">
                <Text size="xs" c="dimmed" ff="monospace">{formatDateTime(ev.datetime)}</Text>
                <Text size="sm">{ev.summary}</Text>
              </Group>
            ))}
          </Stack>
        </Alert>
      )}

      {showForm && (
        <Paper bg="gray.0" p="md" radius="lg">
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <SimpleGrid cols={2}>
                <TextInput
                  label={'\uC77C\uC2DC'} type="datetime-local" required
                  value={form.datetime}
                  onChange={(e) => setForm({ ...form, datetime: e.currentTarget.value })}
                />
                <Select
                  label={'\uC720\uD615'} data={HEARING_TYPES}
                  value={form.type}
                  onChange={(val) => setForm({ ...form, type: val })}
                />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <TextInput
                  label={'\uBC95\uC6D0'} placeholder={'\uC11C\uC6B8\uC911\uC559\uC9C0\uBC29\uBC95\uC6D0'}
                  value={form.court}
                  onChange={(e) => setForm({ ...form, court: e.currentTarget.value })}
                />
                <TextInput
                  label={'\uBC95\uC815'} placeholder="305\uD638"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.currentTarget.value })}
                />
              </SimpleGrid>
              <TextInput
                label={'\uBA54\uBAA8'} placeholder={'\uAE30\uC77C \uAD00\uB828 \uBA54\uBAA8'}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.currentTarget.value })}
              />
              <Group justify="flex-end">
                <Button type="submit" loading={isSubmitting} disabled={!form.datetime}>{'\uAE30\uC77C \uCD94\uAC00'}</Button>
              </Group>
            </Stack>
          </form>
        </Paper>
      )}

      {upcomingHearings.length > 0 && (
        <div>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">{'\uC608\uC815\uB41C \uAE30\uC77C'}</Text>
          <Stack gap="sm">{upcomingHearings.map((h) => renderHearing(h, true))}</Stack>
        </div>
      )}

      {pastHearings.length > 0 && (
        <div>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">{'\uC9C0\uB09C \uAE30\uC77C'}</Text>
          <Stack gap="sm">{pastHearings.map((h) => renderHearing(h, false))}</Stack>
        </div>
      )}

      {hearings.length === 0 && !showForm && calendarEvents === null && (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          {'\uB4F1\uB85D\uB41C \uAE30\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uCE98\uB9B0\uB354\uC5D0\uC11C \uAC00\uC838\uC624\uAC70\uB098 \uC9C1\uC811 \uCD94\uAC00\uD558\uC138\uC694.'}
        </Text>
      )}
    </Stack>
  )
}
