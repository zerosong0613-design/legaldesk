import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Group, Text, ActionIcon, Tabs, Center, Loader,
  Container, Stack, Box,
} from '@mantine/core'
import { IconArrowLeft, IconTimeline, IconCalendarEvent, IconMessageCircle, IconMail, IconFiles } from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import Badge from '../components/ui/Badge'
import HearingList from '../components/case/HearingList'
import KakaoParser from '../components/case/KakaoParser'
import Timeline from '../components/case/Timeline'
import EmailList from '../components/case/EmailList'
import DocumentList from '../components/case/DocumentList'
import Toast from '../components/ui/Toast'

const TABS = [
  { id: 'timeline', label: '\uD0C0\uC784\uB77C\uC778', icon: IconTimeline },
  { id: 'hearings', label: '\uAE30\uC77C', icon: IconCalendarEvent },
  { id: 'kakao', label: '\uCE74\uCE74\uC624\uD1A1', icon: IconMessageCircle },
  { id: 'email', label: '\uC774\uBA54\uC77C', icon: IconMail },
  { id: 'docs', label: '\uBB38\uC11C', icon: IconFiles },
]

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentCase, loadCaseDetail, isLoading } = useCaseStore()
  const [activeTab, setActiveTab] = useState('timeline')

  useEffect(() => {
    loadCaseDetail(id)
  }, [id, loadCaseDetail])

  if (isLoading || !currentCase) {
    return (
      <Center mih="100vh" bg="#f0f2f5">
        <Loader color="indigo" size="md" />
      </Center>
    )
  }

  return (
    <Box mih="100vh" bg="#f0f2f5">
      {/* Sticky \uD5E4\uB354 */}
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
                <Text size="lg" fw={700} truncate>{currentCase.clientName}</Text>
                <Badge status={currentCase.status} />
              </Group>
              <Text size="sm" c="dimmed" ff="monospace">
                {currentCase.caseNumber || '\uC0AC\uAC74\uBC88\uD638 \uBBF8\uC815'}
                {currentCase.court && ` | ${currentCase.court}`}
                {currentCase.type && ` | ${currentCase.type}`}
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

      {/* \uCF58\uD150\uCE20 */}
      <Container size="md" py="lg">
        {activeTab === 'timeline' && <Timeline caseData={currentCase} />}
        {activeTab === 'hearings' && <HearingList caseData={currentCase} />}
        {activeTab === 'kakao' && <KakaoParser caseData={currentCase} />}
        {activeTab === 'email' && <EmailList caseData={currentCase} />}
        {activeTab === 'docs' && <DocumentList caseData={currentCase} />}
      </Container>

      <Toast />
    </Box>
  )
}
