import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Group, Text, ActionIcon, Tabs, Center, Loader,
  Container, Stack, Box, Card, SimpleGrid, Badge as MantineBadge,
} from '@mantine/core'
import {
  IconArrowLeft, IconTimeline, IconCalendarEvent, IconMessageCircle,
  IconMail, IconFiles, IconInfoCircle, IconEdit,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import Badge from '../components/ui/Badge'
import HearingList from '../components/case/HearingList'
import KakaoParser from '../components/case/KakaoParser'
import Timeline from '../components/case/Timeline'
import EmailList from '../components/case/EmailList'
import DocumentList from '../components/case/DocumentList'
import CaseForm from '../components/case/CaseForm'
import Modal from '../components/ui/Modal'
import Toast from '../components/ui/Toast'
import { getDday } from '../utils/dateUtils'

const TABS = [
  { id: 'info', label: '\uC0AC\uAC74\uC815\uBCF4', icon: IconInfoCircle },
  { id: 'timeline', label: '\uD0C0\uC784\uB77C\uC778', icon: IconTimeline },
  { id: 'hearings', label: '\uAE30\uC77C', icon: IconCalendarEvent },
  { id: 'kakao', label: '\uCE74\uCE74\uC624\uD1A1', icon: IconMessageCircle },
  { id: 'email', label: '\uC774\uBA54\uC77C', icon: IconMail },
  { id: 'docs', label: '\uBB38\uC11C', icon: IconFiles },
]

function InfoTab({ caseData }) {
  const { updateCase, loadCaseDetail } = useCaseStore()
  const { showToast, openModal, closeModal, isModalOpen, modalType } = useUiStore()

  const handleEditSubmit = async (data) => {
    try {
      await updateCase(caseData.id, data)
      await loadCaseDetail(caseData.id)
      closeModal()
      showToast('\uC0AC\uAC74 \uC815\uBCF4\uAC00 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    } catch (err) {
      showToast(`\uC218\uC815 \uC2E4\uD328: ${err.message}`, 'error')
    }
  }

  const dday = getDday(caseData.nextHearingDate)
  const ddayText = dday === null ? null : dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`

  return (
    <Stack gap="md">
      {/* Case Info Card */}
      <Card padding="md">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={600}>{'\uC0AC\uAC74 \uC815\uBCF4'}</Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => openModal('editCaseDetail', caseData)}
          >
            <IconEdit size={14} />
          </ActionIcon>
        </Group>

        <Stack gap="sm">
          <SimpleGrid cols={2}>
            <div>
              <Text size="xs" c="dimmed">{'\uC758\uB8B0\uC778(\uC6D0\uACE0)'}</Text>
              <Text size="sm" fw={500}>{caseData.clientName || '-'}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">{'\uC0C1\uB300\uBC29(\uD53C\uACE0)'}</Text>
              <Text size="sm">{caseData.opponent || '-'}</Text>
            </div>
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <div>
              <Text size="xs" c="dimmed">{'\uC0AC\uAC74\uBC88\uD638'}</Text>
              <Text size="sm" ff="monospace">{caseData.caseNumber || '-'}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">{'\uC0AC\uAC74 \uC720\uD615'}</Text>
              <Text size="sm">{caseData.type || '-'}</Text>
            </div>
          </SimpleGrid>

          {caseData.caseName && (
            <div>
              <Text size="xs" c="dimmed">{'\uC0AC\uAC74\uBA85'}</Text>
              <Text size="sm">{caseData.caseName}</Text>
            </div>
          )}

          <SimpleGrid cols={2}>
            <div>
              <Text size="xs" c="dimmed">{'\uBC95\uC6D0'}</Text>
              <Text size="sm">{caseData.court || '-'}</Text>
            </div>
            <div>
              <Text size="xs" c="dimmed">{'\uC7AC\uD310\uBD80'}</Text>
              <Text size="sm">{caseData.division || '-'}</Text>
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

          {caseData.nextHearingDate && (
            <div>
              <Text size="xs" c="dimmed">{'\uB2E4\uC74C \uAE30\uC77C'}</Text>
              <Group gap="xs">
                <Text size="sm">{new Date(caseData.nextHearingDate).toLocaleString('ko-KR')}</Text>
                {ddayText && (
                  <MantineBadge
                    size="xs"
                    variant="light"
                    color={dday <= 7 && dday >= 0 ? 'red' : dday < 0 ? 'gray' : 'indigo'}
                    ff="monospace"
                  >
                    {ddayText}
                  </MantineBadge>
                )}
              </Group>
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
        </Stack>
      </Card>

      {/* Contact Card */}
      <Card padding="md">
        <Text size="sm" fw={600} mb="md">{'\uC5F0\uB77D\uCC98'}</Text>
        <Stack gap="sm">
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
          {!caseData.clientEmail && (
            <Text size="xs" c="orange">
              {'\uC758\uB8B0\uC778 \uC774\uBA54\uC77C\uC744 \uC785\uB825\uD558\uBA74 \uC774\uBA54\uC77C \uD0ED\uC5D0\uC11C \uAD00\uB828 \uBA54\uC77C\uC744 \uC790\uB3D9 \uAC80\uC0C9\uD569\uB2C8\uB2E4.'}
            </Text>
          )}
        </Stack>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen && modalType === 'editCaseDetail'}
        onClose={closeModal}
        title={'\uC0AC\uAC74 \uC815\uBCF4 \uC218\uC815'}
      >
        <CaseForm
          initialData={caseData}
          onSubmit={handleEditSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </Stack>
  )
}

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentCase, loadCaseDetail, isLoading } = useCaseStore()
  const [activeTab, setActiveTab] = useState('info')

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
        {activeTab === 'info' && <InfoTab caseData={currentCase} />}
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
