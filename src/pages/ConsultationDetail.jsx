import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Group, Text, ActionIcon, Tabs, Center, Loader,
  Container, Stack, ThemeIcon, Badge as MantineBadge, Box,
  Card, SimpleGrid, Button, TextInput, Select, Textarea,
} from '@mantine/core'
import {
  IconArrowLeft, IconTimeline, IconMessageCircle,
  IconFiles, IconInfoCircle, IconEdit, IconCalendarEvent,
  IconCheck, IconX, IconPlus, IconTrash,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import Badge from '../components/ui/Badge'
import ConsultRecordTab from '../components/case/ConsultRecordTab'
import Timeline from '../components/case/Timeline'
import DocumentList from '../components/case/DocumentList'
import { readCaseDetail, writeCaseDetail } from '../api/drive'
import { createCalendarEvent, deleteCalendarEvent } from '../api/calendar'
import { formatDateWithDay, getDday } from '../utils/dateUtils'

const CONSULT_TYPES = ['\uACC4\uC57D\uAC80\uD1A0', '\uBC95\uB960\uC758\uACAC\uC11C', '\uADDC\uC815\uC790\uBB38', '\uC77C\uBC18\uC0C1\uB2F4', '\uAE30\uD0C0']
const CONSULT_STATUSES = ['\uC811\uC218', '\uC9C4\uD589', '\uC644\uB8CC', '\uBCF4\uB958']

const TABS = [
  { id: 'info', label: '\uC790\uBB38\uC815\uBCF4', icon: IconInfoCircle },
  { id: 'consultation', label: '\uC0C1\uB2F4', icon: IconMessageCircle },
  { id: 'timeline', label: '\uD0C0\uC784\uB77C\uC778', icon: IconTimeline },
  { id: 'docs', label: '\uBB38\uC11C', icon: IconFiles },
]

function getDdayText(dateStr) {
  const d = getDday(dateStr)
  if (d === null) return null
  if (d === 0) return 'D-Day'
  if (d > 0) return `D-${d}`
  return `D+${Math.abs(d)}`
}

function DeadlineCard({ caseData, onUpdate }) {
  const { showToast } = useUiStore()
  const [deadline, setDeadline] = useState(caseData.deadline || '')
  const [isSaving, setIsSaving] = useState(false)
  const dday = getDday(caseData.deadline)
  const ddayText = getDdayText(caseData.deadline)
  const isUrgent = dday !== null && dday >= 0 && dday <= 7

  const handleSaveDeadline = async () => {
    if (!deadline) return
    setIsSaving(true)
    try {
      await onUpdate({ deadline })
      showToast('\uB9C8\uAC10\uC77C\uC774 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    } catch (err) {
      showToast(`\uB9C8\uAC10\uC77C \uC218\uC815 \uC2E4\uD328: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddToCalendar = async () => {
    if (!caseData.deadline) return
    setIsSaving(true)
    try {
      const event = await createCalendarEvent({
        caseNumber: '',
        clientName: caseData.clientName,
        type: `\uC790\uBB38 \uB9C8\uAC10 \u2014 ${caseData.subject || caseData.type}`,
        datetime: new Date(caseData.deadline + 'T09:00:00').toISOString(),
        court: '',
        room: '',
        note: `\uC790\uBB38 \uC720\uD615: ${caseData.type}\n\uC758\uB8B0\uC778: ${caseData.clientName}`,
      })
      if (event?.id) {
        const detail = await readCaseDetail(caseData.driveFileId)
        detail.calendarEventId = event.id
        await writeCaseDetail(caseData.driveFileId, detail)
        showToast('\uCE98\uB9B0\uB354\uC5D0 \uB9C8\uAC10\uC77C\uC774 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
      }
    } catch (err) {
      showToast(`\uCE98\uB9B0\uB354 \uCD94\uAC00 \uC2E4\uD328: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card padding="md" style={{
      borderTop: isUrgent ? '3px solid var(--mantine-color-orange-5)' : '3px solid var(--mantine-color-indigo-5)',
    }}>
      <Group justify="space-between" mb="sm">
        <Text size="sm" fw={600}>{'\uB9C8\uAC10\uC77C \uAD00\uB9AC'}</Text>
        {ddayText && (
          <MantineBadge
            color={isUrgent ? 'orange' : dday < 0 ? 'gray' : 'indigo'}
            variant={dday === 0 ? 'filled' : 'light'}
            size="sm"
            ff="monospace"
          >
            {ddayText}
          </MantineBadge>
        )}
      </Group>
      {caseData.deadline ? (
        <Text size="sm" mb="sm" fw={isUrgent ? 600 : 400} c={isUrgent ? 'orange' : undefined}>
          {formatDateWithDay(caseData.deadline + 'T00:00:00')}
        </Text>
      ) : (
        <Text size="sm" c="dimmed" mb="sm">{'\uB9C8\uAC10\uC77C\uC774 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4'}</Text>
      )}
      <Group gap="sm">
        <TextInput
          type="date"
          size="xs"
          value={deadline}
          onChange={(e) => setDeadline(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Button size="xs" onClick={handleSaveDeadline} loading={isSaving} disabled={!deadline}>
          {'\uC800\uC7A5'}
        </Button>
        {caseData.deadline && (
          <Button
            size="xs"
            variant="light"
            color="indigo"
            leftSection={<IconCalendarEvent size={14} />}
            onClick={handleAddToCalendar}
            loading={isSaving}
          >
            {'\uCE98\uB9B0\uB354'}
          </Button>
        )}
      </Group>
    </Card>
  )
}

function InfoTab({ caseData }) {
  const { updateConsultation, loadCaseDetail } = useCaseStore()
  const { showToast } = useUiStore()
  const [editing, setEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({})

  function toArray(val) {
    if (Array.isArray(val)) return val.length > 0 ? val : ['']
    if (val) return [val]
    return ['']
  }

  const startEdit = () => {
    setForm({
      clientName: caseData.clientName || '',
      type: caseData.type || '\uACC4\uC57D\uAC80\uD1A0',
      status: caseData.status || '\uC811\uC218',
      subject: caseData.subject || '',
      deadline: caseData.deadline || '',
      clientEmails: toArray(caseData.clientEmails || caseData.clientEmail),
      clientPhones: toArray(caseData.clientPhones || caseData.clientPhone),
      tags: caseData.tags?.join(', ') || '',
      note: caseData.note || '',
    })
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const handleSave = async () => {
    if (!form.clientName.trim()) return
    setIsSaving(true)
    try {
      const emails = form.clientEmails.map((e) => e.trim()).filter(Boolean)
      const phones = form.clientPhones.map((p) => p.trim()).filter(Boolean)
      const data = {
        ...form,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        clientEmails: emails,
        clientPhones: phones,
        clientEmail: emails[0] || '',
        clientPhone: phones[0] || '',
      }
      await updateConsultation(caseData.id, data)
      await loadCaseDetail(caseData.id)
      setEditing(false)
      showToast('\uC790\uBB38 \uC815\uBCF4\uAC00 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    } catch (err) {
      showToast(`\uC218\uC815 \uC2E4\uD328: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChange = (name, value) => setForm({ ...form, [name]: value })

  const handleArrayChange = (field, index, value) => {
    const arr = [...form[field]]
    arr[index] = value
    setForm({ ...form, [field]: arr })
  }

  const handleArrayAdd = (field) => {
    setForm({ ...form, [field]: [...form[field], ''] })
  }

  const handleArrayRemove = (field, index) => {
    const arr = form[field].filter((_, i) => i !== index)
    setForm({ ...form, [field]: arr.length > 0 ? arr : [''] })
  }

  const handleUpdate = async (updates) => {
    await updateConsultation(caseData.id, updates)
    await loadCaseDetail(caseData.id)
  }

  // --- \uC218\uC815 \uBAA8\uB4DC ---
  if (editing) {
    return (
      <Card padding="md">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={600}>{'\uC790\uBB38 \uC815\uBCF4 \uC218\uC815'}</Text>
          <Group gap={4}>
            <Button size="xs" variant="subtle" color="gray" leftSection={<IconX size={14} />} onClick={cancelEdit}>
              {'\uCDE8\uC18C'}
            </Button>
            <Button size="xs" leftSection={<IconCheck size={14} />} onClick={handleSave} loading={isSaving}>
              {'\uC800\uC7A5'}
            </Button>
          </Group>
        </Group>

        <Stack gap="sm">
          <SimpleGrid cols={2}>
            <TextInput
              label={'\uC758\uB8B0\uC778'}
              value={form.clientName}
              onChange={(e) => handleChange('clientName', e.currentTarget.value)}
              required
            />
            <Select
              label={'\uC790\uBB38 \uC720\uD615'}
              data={CONSULT_TYPES}
              value={form.type}
              onChange={(val) => handleChange('type', val)}
            />
          </SimpleGrid>

          <TextInput
            label={'\uC8FC\uC81C'}
            value={form.subject}
            onChange={(e) => handleChange('subject', e.currentTarget.value)}
          />

          <SimpleGrid cols={2}>
            <Select
              label={'\uC0C1\uD0DC'}
              data={CONSULT_STATUSES}
              value={form.status}
              onChange={(val) => handleChange('status', val)}
            />
            <TextInput
              label={'\uB9C8\uAC10\uC77C'}
              type="date"
              value={form.deadline}
              onChange={(e) => handleChange('deadline', e.currentTarget.value)}
            />
          </SimpleGrid>

          {/* \uC774\uBA54\uC77C \uBCF5\uC218 */}
          <div>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>{'\uC774\uBA54\uC77C'}</Text>
              <Button variant="subtle" size="xs" leftSection={<IconPlus size={12} />} onClick={() => handleArrayAdd('clientEmails')}>
                {'\uCD94\uAC00'}
              </Button>
            </Group>
            <Stack gap={4}>
              {form.clientEmails?.map((email, i) => (
                <Group key={i} gap={4}>
                  <TextInput
                    size="sm"
                    type="email"
                    placeholder="client@example.com"
                    value={email}
                    onChange={(e) => handleArrayChange('clientEmails', i, e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                  {form.clientEmails.length > 1 && (
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleArrayRemove('clientEmails', i)}>
                      <IconTrash size={12} />
                    </ActionIcon>
                  )}
                </Group>
              ))}
            </Stack>
          </div>

          {/* \uC804\uD654\uBC88\uD638 \uBCF5\uC218 */}
          <div>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>{'\uC804\uD654\uBC88\uD638'}</Text>
              <Button variant="subtle" size="xs" leftSection={<IconPlus size={12} />} onClick={() => handleArrayAdd('clientPhones')}>
                {'\uCD94\uAC00'}
              </Button>
            </Group>
            <Stack gap={4}>
              {form.clientPhones?.map((phone, i) => (
                <Group key={i} gap={4}>
                  <TextInput
                    size="sm"
                    type="tel"
                    placeholder="010-0000-0000"
                    value={phone}
                    onChange={(e) => handleArrayChange('clientPhones', i, e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                  {form.clientPhones.length > 1 && (
                    <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleArrayRemove('clientPhones', i)}>
                      <IconTrash size={12} />
                    </ActionIcon>
                  )}
                </Group>
              ))}
            </Stack>
          </div>

          <TextInput
            label={'\uD0DC\uADF8'}
            placeholder={'\uC27C\uD45C\uB85C \uAD6C\uBD84 (\uC608: \uACC4\uC57D, \uAC80\uD1A0)'}
            value={form.tags}
            onChange={(e) => handleChange('tags', e.currentTarget.value)}
          />

          <Textarea
            label={'\uBA54\uBAA8'}
            placeholder={'\uC790\uBB38 \uAD00\uB828 \uBA54\uBAA8'}
            value={form.note}
            onChange={(e) => handleChange('note', e.currentTarget.value)}
            minRows={2}
          />
        </Stack>
      </Card>
    )
  }

  // --- \uBCF4\uAE30 \uBAA8\uB4DC ---
  const emails = caseData.clientEmails?.length > 0 ? caseData.clientEmails : (caseData.clientEmail ? [caseData.clientEmail] : [])
  const phones = caseData.clientPhones?.length > 0 ? caseData.clientPhones : (caseData.clientPhone ? [caseData.clientPhone] : [])

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {/* 자문 정보 */}
      <Stack gap="md">
        <DeadlineCard caseData={caseData} onUpdate={handleUpdate} />

        <Card padding="lg">
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={600}>{'\uC790\uBB38 \uC815\uBCF4'}</Text>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconEdit size={14} />}
              onClick={startEdit}
            >
              {'\uC218\uC815'}
            </Button>
          </Group>

          <Stack gap="sm">
            <SimpleGrid cols={2}>
              <div>
                <Text size="xs" c="dimmed">{'\uC758\uB8B0\uC778'}</Text>
                <Text size="sm" fw={500}>{caseData.clientName}</Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">{'\uC790\uBB38 \uC720\uD615'}</Text>
                <Text size="sm">{caseData.type || '-'}</Text>
              </div>
            </SimpleGrid>

            <SimpleGrid cols={2}>
              <div>
                <Text size="xs" c="dimmed">{'\uC0C1\uD0DC'}</Text>
                <Badge status={caseData.status} />
              </div>
              <div>
                <Text size="xs" c="dimmed">{'\uB4F1\uB85D\uC77C'}</Text>
                <Text size="sm">{caseData.openedAt || '-'}</Text>
              </div>
            </SimpleGrid>

            {caseData.subject && (
              <div>
                <Text size="xs" c="dimmed">{'\uC8FC\uC81C'}</Text>
                <Text size="sm">{caseData.subject}</Text>
              </div>
            )}

            {caseData.tags?.length > 0 && (
              <div>
                <Text size="xs" c="dimmed" mb={4}>{'\uD0DC\uADF8'}</Text>
                <Group gap={4}>
                  {caseData.tags.map((tag) => (
                    <MantineBadge key={tag} variant="light" color="gray" size="xs">
                      {tag}
                    </MantineBadge>
                  ))}
                </Group>
              </div>
            )}

            {caseData.note && (
              <div>
                <Text size="xs" c="dimmed">{'\uBA54\uBAA8'}</Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{caseData.note}</Text>
              </div>
            )}
          </Stack>
        </Card>
      </Stack>

      {/* 연락처 */}
      <Card padding="lg">
        <Text size="sm" fw={600} mb="md">{'\uC5F0\uB77D\uCC98'}</Text>
        <Stack gap="sm">
          <div>
            <Text size="xs" c="dimmed">{'\uC774\uBA54\uC77C'}</Text>
            {emails.length > 0 ? emails.map((e, i) => (
              <Text key={i} size="sm">{e}</Text>
            )) : <Text size="sm" c="dimmed">-</Text>}
          </div>
          <div>
            <Text size="xs" c="dimmed">{'\uC804\uD654\uBC88\uD638'}</Text>
            {phones.length > 0 ? phones.map((p, i) => (
              <Text key={i} size="sm">{p}</Text>
            )) : <Text size="sm" c="dimmed">-</Text>}
          </div>
        </Stack>
      </Card>
    </SimpleGrid>
  )
}

export default function ConsultationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentCase, loadCaseDetail, isLoading } = useCaseStore()
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    loadCaseDetail(id)
  }, [id, loadCaseDetail])

  if (isLoading || !currentCase) {
    return (
      <Center mih="50vh">
        <Loader color="indigo" size="md" />
      </Center>
    )
  }

  const dday = getDday(currentCase.deadline)
  const ddayText = getDdayText(currentCase.deadline)
  const isUrgent = dday !== null && dday >= 0 && dday <= 7

  return (
    <>
      {/* Sticky header */}
      <Box
        bg="white"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          borderBottom: '1px solid var(--mantine-color-gray-2)',
        }}
      >
        <Container size="xl" py="sm">
          <Group gap="sm" mb="sm">
            <ActionIcon variant="subtle" color="gray" onClick={() => navigate('/consultations')}>
              <IconArrowLeft size={18} />
            </ActionIcon>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs">
                <MantineBadge variant="light" color="grape" size="xs">{'\uC790\uBB38'}</MantineBadge>
                <Text size="lg" fw={700} truncate>{currentCase.clientName}</Text>
                <Badge status={currentCase.status} />
              </Group>
              <Text size="sm" c="dimmed">
                {currentCase.type || ''}
                {currentCase.subject && ` \u2014 ${currentCase.subject}`}
                {currentCase.deadline && (
                  <>
                    {' | '}
                    <Text span c={isUrgent ? 'orange' : 'dimmed'} fw={isUrgent ? 600 : 400}>
                      {'\uB9C8\uAC10'} {currentCase.deadline}
                      {ddayText && ` (${ddayText})`}
                    </Text>
                  </>
                )}
              </Text>
            </div>
          </Group>

          <Tabs value={activeTab} onChange={setActiveTab} variant="default">
            <Tabs.List>
              {TABS.map((tab) => (
                <Tabs.Tab key={tab.id} value={tab.id} leftSection={<tab.icon size={14} />}>
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </Container>
      </Box>

      {/* Content */}
      <Container size="xl" py="lg">
        {activeTab === 'info' && <InfoTab caseData={currentCase} />}
        {activeTab === 'consultation' && <ConsultRecordTab caseData={currentCase} />}
        {activeTab === 'timeline' && <Timeline caseData={currentCase} />}
        {activeTab === 'docs' && <DocumentList caseData={currentCase} />}
      </Container>
    </>
  )
}
