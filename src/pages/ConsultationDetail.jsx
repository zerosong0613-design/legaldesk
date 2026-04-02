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
  IconCheck, IconX, IconPlus, IconTrash, IconReceipt,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import Badge from '../components/ui/Badge'
import ConsultRecordTab from '../components/case/ConsultRecordTab'
import Timeline from '../components/case/Timeline'
import DocumentList from '../components/case/DocumentList'
import ContactList, { migrateContacts } from '../components/case/ContactList'
import CaseBillingTab from '../components/case/CaseBillingTab'
import { readCaseDetail, writeCaseDetail } from '../api/drive'
import { createCalendarEvent, deleteCalendarEvent } from '../api/calendar'
import { formatDateWithDay, getDday } from '../utils/dateUtils'

const CONSULT_TYPES = ['\uACC4\uC57D\uAC80\uD1A0', '\uBC95\uB960\uC758\uACAC\uC11C', '\uADDC\uC815\uC790\uBB38', '\uC77C\uBC18\uC0C1\uB2F4', '\uAE30\uD0C0']
const CONSULT_STATUSES = ['\uC811\uC218', '\uC9C4\uD589', '\uC644\uB8CC', '\uBCF4\uB958']

const TABS = [
  { id: 'info', label: '\uC790\uBB38\uC815\uBCF4', icon: IconInfoCircle },
  { id: 'consultation', label: '\uD65C\uB3D9\uAE30\uB85D', icon: IconMessageCircle },
  { id: 'timeline', label: '\uD0C0\uC784\uB77C\uC778', icon: IconTimeline },
  { id: 'docs', label: '\uBB38\uC11C', icon: IconFiles },
  { id: 'billing', label: '\uBE44\uC6A9', icon: IconReceipt },
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
  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] = useState({
    clientName: caseData.clientName || '',
    type: caseData.type || '계약검토',
    status: caseData.status || '접수',
    subject: caseData.subject || '',
    deadline: caseData.deadline || '',
    tags: caseData.tags?.join(', ') || '',
    note: caseData.note || '',
    contacts: migrateContacts(caseData),
  })

  const h = (name, value) => setForm({ ...form, [name]: value })

  const handleSave = async () => {
    if (!form.clientName.trim()) return
    setIsSaving(true)
    try {
      const contacts = form.contacts.filter((c) => c.name.trim() || c.phone.trim() || c.email.trim())
      const mainContact = contacts.find((c) => c.role === '본인') || contacts[0] || {}
      const allEmails = contacts.map((c) => c.email).filter(Boolean)
      const allPhones = contacts.map((c) => c.phone).filter(Boolean)
      const data = {
        clientName: form.clientName,
        type: form.type,
        status: form.status,
        subject: form.subject,
        deadline: form.deadline,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        note: form.note,
        contacts,
        clientEmail: mainContact.email || '',
        clientPhone: mainContact.phone || '',
        clientEmails: allEmails,
        clientPhones: allPhones,
      }
      await updateConsultation(caseData.id, data)
      await loadCaseDetail(caseData.id)
      showToast('자문 정보가 저장되었습니다.', 'success')
    } catch (err) {
      showToast(`저장 실패: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdate = async (updates) => {
    await updateConsultation(caseData.id, updates)
    await loadCaseDetail(caseData.id)
  }

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <Stack gap="md">
        <DeadlineCard caseData={caseData} onUpdate={handleUpdate} />

        <Card padding="lg">
          <Group justify="space-between" mb="md">
            <Text size="sm" fw={600}>자문 정보</Text>
            <Button size="xs" leftSection={<IconCheck size={14} />} onClick={handleSave} loading={isSaving}>저장</Button>
          </Group>

          <Stack gap="sm">
            <SimpleGrid cols={2}>
              <TextInput label="의뢰인" value={form.clientName} onChange={(e) => h('clientName', e.currentTarget.value)} required />
              <Select label="자문 유형" data={CONSULT_TYPES} value={form.type} onChange={(val) => h('type', val)} />
            </SimpleGrid>

            <TextInput label="주제" value={form.subject} onChange={(e) => h('subject', e.currentTarget.value)} />

            <SimpleGrid cols={2}>
              <Select label="상태" data={CONSULT_STATUSES} value={form.status} onChange={(val) => h('status', val)} />
              <TextInput label="마감일" type="date" value={form.deadline} onChange={(e) => h('deadline', e.currentTarget.value)} />
            </SimpleGrid>

            <TextInput label="태그" placeholder="쉼표로 구분" value={form.tags} onChange={(e) => h('tags', e.currentTarget.value)} />
            <Textarea label="메모" placeholder="자문 관련 메모" value={form.note} onChange={(e) => h('note', e.currentTarget.value)} minRows={2} autosize />
          </Stack>
        </Card>
      </Stack>

      <Card padding="lg">
        <ContactList contacts={form.contacts} onChange={(contacts) => h('contacts', contacts)} />
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
        {activeTab === 'consultation' && <ConsultRecordTab caseData={{ ...currentCase, type: '자문' }} />}
        {activeTab === 'timeline' && <Timeline caseData={currentCase} />}
        {activeTab === 'docs' && <DocumentList caseData={currentCase} />}
        {activeTab === 'billing' && <CaseBillingTab caseData={currentCase} />}
      </Container>
    </>
  )
}
