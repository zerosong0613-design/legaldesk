import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Group, Text, ActionIcon, Tabs, Center, Loader,
  Container, Stack, ThemeIcon, Badge as MantineBadge, Box,
  Card, SimpleGrid, Button, TextInput, Select,
} from '@mantine/core'
import {
  IconArrowLeft, IconTimeline, IconMessageCircle,
  IconFiles, IconInfoCircle, IconEdit, IconCalendarEvent,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import Badge from '../components/ui/Badge'
import KakaoParser from '../components/case/KakaoParser'
import Timeline from '../components/case/Timeline'
import DocumentList from '../components/case/DocumentList'
import ConsultationForm from '../components/case/ConsultationForm'
import Modal from '../components/ui/Modal'
import { readCaseDetail, writeCaseDetail } from '../api/drive'
import { createCalendarEvent, deleteCalendarEvent } from '../api/calendar'
import { formatDateWithDay, getDday } from '../utils/dateUtils'

const TABS = [
  { id: 'timeline', label: '\uD0C0\uC784\uB77C\uC778', icon: IconTimeline },
  { id: 'kakao', label: '\uCE74\uCE74\uC624\uD1A1', icon: IconMessageCircle },
  { id: 'docs', label: '\uBB38\uC11C', icon: IconFiles },
  { id: 'info', label: '\uC815\uBCF4', icon: IconInfoCircle },
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
  const { showToast, openModal, closeModal, isModalOpen, modalType } = useUiStore()

  const handleUpdate = async (updates) => {
    await updateConsultation(caseData.id, updates)
    await loadCaseDetail(caseData.id)
  }

  const handleEditSubmit = async (data) => {
    try {
      await updateConsultation(caseData.id, data)
      await loadCaseDetail(caseData.id)
      closeModal()
      showToast('\uC790\uBB38 \uC815\uBCF4\uAC00 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    } catch (err) {
      showToast(`\uC218\uC815 \uC2E4\uD328: ${err.message}`, 'error')
    }
  }

  return (
    <Stack gap="md">
      {/* Deadline Management */}
      <DeadlineCard caseData={caseData} onUpdate={handleUpdate} />

      {/* Consultation Info */}
      <Card padding="md">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={600}>{'\uC790\uBB38 \uC815\uBCF4'}</Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => openModal('editConsultationDetail', caseData)}
          >
            <IconEdit size={14} />
          </ActionIcon>
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

          <SimpleGrid cols={2}>
            <div>
              <Text size="xs" c="dimmed">{'\uC774\uBA54\uC77C'}</Text>
              <Text size="sm">{caseData.clientEmail || '-'}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">{'\uC804\uD654\uBC88\uD638'}</Text>
              <Text size="sm">{caseData.clientPhone || '-'}</Text>
            </div>
          </SimpleGrid>

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
        </Stack>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen && modalType === 'editConsultationDetail'}
        onClose={closeModal}
        title={'\uC790\uBB38 \uC815\uBCF4 \uC218\uC815'}
      >
        <ConsultationForm
          initialData={caseData}
          onSubmit={handleEditSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </Stack>
  )
}

export default function ConsultationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentCase, loadCaseDetail, isLoading } = useCaseStore()
  const [activeTab, setActiveTab] = useState('timeline')

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
        <Container size="md" py="sm">
          <Group gap="sm" mb="sm">
            <ActionIcon variant="subtle" color="gray" onClick={() => navigate('/')}>
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
      <Container size="md" py="lg">
        {activeTab === 'timeline' && <Timeline caseData={currentCase} />}
        {activeTab === 'kakao' && <KakaoParser caseData={currentCase} />}

        {activeTab === 'docs' && <DocumentList caseData={currentCase} />}

        {activeTab === 'info' && <InfoTab caseData={currentCase} />}
      </Container>
    </>
  )
}
