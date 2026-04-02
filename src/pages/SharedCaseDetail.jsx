import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Group, Text, ActionIcon, Tabs, Center, Loader,
  Container, Stack, Badge as MantineBadge, Alert,
} from '@mantine/core'
import {
  IconArrowLeft, IconTimeline, IconMessageCircle,
  IconFiles, IconInfoCircle, IconCalendarEvent, IconReceipt,
  IconUser, IconLock,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import Badge from '../components/ui/Badge'
import HearingList from '../components/case/HearingList'
import Timeline from '../components/case/Timeline'
import ConsultRecordTab from '../components/case/ConsultRecordTab'
import DocumentList from '../components/case/DocumentList'

const TABS = [
  { id: 'info', label: '사건정보', icon: IconInfoCircle },
  { id: 'consultation', label: '활동기록', icon: IconMessageCircle },
  { id: 'hearings', label: '기일', icon: IconCalendarEvent },
  { id: 'timeline', label: '타임라인', icon: IconTimeline },
  { id: 'docs', label: '문서', icon: IconFiles },
]

function InfoSection({ caseData }) {
  const summary = caseData._summary || caseData
  return (
    <Stack gap="md">
      <Alert color="blue" variant="light" icon={<IconLock size={16} />}>
        <Text size="sm">
          이 사건은 {summary.ownerName || summary.ownerEmail || '다른 사용자'}가 공유한 사건입니다.
          {caseData.myRole === 'reader' && ' (읽기 전용)'}
        </Text>
      </Alert>

      <Stack gap="xs">
        {summary.clientName && (
          <Group gap="xs">
            <Text size="sm" c="dimmed" w={100}>의뢰인</Text>
            <Text size="sm" fw={500}>{summary.clientName}</Text>
          </Group>
        )}
        {summary.caseNumber && (
          <Group gap="xs">
            <Text size="sm" c="dimmed" w={100}>사건번호</Text>
            <Text size="sm" ff="monospace">{summary.caseNumber}</Text>
          </Group>
        )}
        {summary.type && (
          <Group gap="xs">
            <Text size="sm" c="dimmed" w={100}>유형</Text>
            <Text size="sm">{summary.type}</Text>
          </Group>
        )}
        {summary.court && (
          <Group gap="xs">
            <Text size="sm" c="dimmed" w={100}>법원</Text>
            <Text size="sm">{summary.court}</Text>
          </Group>
        )}
        {summary.status && (
          <Group gap="xs">
            <Text size="sm" c="dimmed" w={100}>상태</Text>
            <Badge status={summary.status} />
          </Group>
        )}
      </Stack>
    </Stack>
  )
}

export default function SharedCaseDetail() {
  const { fileId } = useParams()
  const navigate = useNavigate()
  const { currentCase, loadSharedCaseDetail, isLoading } = useCaseStore()
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    if (fileId) loadSharedCaseDetail(fileId)
  }, [fileId])

  if (isLoading || !currentCase) {
    return <Center h="50vh"><Loader /></Center>
  }

  const summary = currentCase._summary || currentCase
  const isReadOnly = currentCase.myRole === 'reader'

  return (
    <>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: 'var(--mantine-color-body)',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
        }}
      >
        <Container size="xl" py="sm">
          <Group gap="sm" mb="sm">
            <ActionIcon variant="subtle" color="gray" onClick={() => navigate('/')}>
              <IconArrowLeft size={18} />
            </ActionIcon>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs">
                <MantineBadge variant="light" size="xs" color="blue">공유</MantineBadge>
                <Text size="lg" fw={700} truncate>
                  {summary.clientName || summary.caseName || '(이름 없음)'}
                </Text>
                <Badge status={summary.status} />
                {isReadOnly && (
                  <MantineBadge variant="light" size="xs" color="gray">읽기전용</MantineBadge>
                )}
              </Group>
              <Group gap={4}>
                <Text size="sm" c="dimmed" ff="monospace">
                  {summary.caseNumber || ''}
                  {summary.court && ` | ${summary.court}`}
                  {summary.type && ` | ${summary.type}`}
                </Text>
                <Text size="xs" c="dimmed">
                  — {summary.ownerName || summary.ownerEmail}
                </Text>
              </Group>
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
      </div>

      <Container size="xl" py="lg">
        {activeTab === 'info' && <InfoSection caseData={currentCase} />}
        {activeTab === 'consultation' && <ConsultRecordTab caseData={currentCase} />}
        {activeTab === 'hearings' && <HearingList caseData={currentCase} />}
        {activeTab === 'timeline' && <Timeline caseData={currentCase} />}
        {activeTab === 'docs' && <DocumentList caseData={currentCase} />}
      </Container>
    </>
  )
}
