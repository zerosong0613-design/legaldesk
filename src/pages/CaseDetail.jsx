import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Group, Text, ActionIcon, Tabs, Center, Loader,
  Container, Stack, Box, Card, SimpleGrid, Badge as MantineBadge,
  TextInput, Textarea, Select, Button, SegmentedControl,
} from '@mantine/core'
import {
  IconArrowLeft, IconTimeline, IconCalendarEvent, IconMessageCircle,
  IconMail, IconFiles, IconInfoCircle, IconCheck, IconReceipt, IconShare,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import Badge from '../components/ui/Badge'
import ShareCaseModal from '../components/case/ShareCaseModal'
import HearingList from '../components/case/HearingList'
import Timeline from '../components/case/Timeline'
import EmailList from '../components/case/EmailList'
import DocumentList from '../components/case/DocumentList'
import ConsultRecordTab from '../components/case/ConsultRecordTab'
import CaseBillingSummary from '../components/case/CaseBillingSummary'
import CaseBillingTab from '../components/case/CaseBillingTab'
import ContactList, { migrateContacts } from '../components/case/ContactList'
import { getDday } from '../utils/dateUtils'

const CASE_TYPES = ['민사', '가사', '행정', '기타']
const CASE_STATUSES = ['\uC811\uC218', '\uC9C4\uD589', '\uC885\uACB0', '\uBCF4\uB958']

const TABS = [
  { id: 'info', label: '\uC0AC\uAC74\uC815\uBCF4', icon: IconInfoCircle },
  { id: 'consultation', label: '\uD65C\uB3D9\uAE30\uB85D', icon: IconMessageCircle },
  { id: 'hearings', label: '\uAE30\uC77C', icon: IconCalendarEvent },
  { id: 'timeline', label: '\uD0C0\uC784\uB77C\uC778', icon: IconTimeline },
  { id: 'email', label: '\uC774\uBA54\uC77C', icon: IconMail },
  { id: 'docs', label: '\uBB38\uC11C', icon: IconFiles },
  { id: 'billing', label: '\uBE44\uC6A9', icon: IconReceipt },
]

function InfoTab({ caseData }) {
  const { updateCase, loadCaseDetail } = useCaseStore()
  const { showToast } = useUiStore()
  const [isSaving, setIsSaving] = useState(false)

  const [form, setForm] = useState({
    clientName: caseData.clientName || '',
    opponent: caseData.opponent || '',
    caseNumber: caseData.caseNumber || '',
    caseName: caseData.caseName || '',
    type: caseData.type || '민사',
    status: caseData.status || '접수',
    court: caseData.court || '',
    division: caseData.division || '',
    clientMemo: caseData.clientMemo || '',
    tags: caseData.tags?.join(', ') || '',
    clientPosition: caseData.clientPosition || 'plaintiff',
    contacts: migrateContacts(caseData),
  })

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
        opponent: form.opponent,
        caseNumber: form.caseNumber,
        caseName: form.caseName,
        type: form.type,
        status: form.status,
        court: form.court,
        division: form.division,
        clientMemo: form.clientMemo,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        clientPosition: form.clientPosition,
        contacts,
        // backward compat
        clientEmail: mainContact.email || '',
        clientPhone: mainContact.phone || '',
        clientEmails: allEmails,
        clientPhones: allPhones,
      }
      await updateCase(caseData.id, data)
      await loadCaseDetail(caseData.id)
      showToast('사건 정보가 저장되었습니다.', 'success')
    } catch (err) {
      showToast(`저장 실패: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const h = (name, value) => setForm({ ...form, [name]: value })

  const dday = getDday(caseData.nextHearingDate)
  const ddayText = dday === null ? null : dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`
  const hasEmail = form.contacts.some((c) => c.email?.trim())

  return (
    <Stack gap="md">
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      <Card padding="lg">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={600}>사건 정보</Text>
          <Button size="xs" leftSection={<IconCheck size={14} />} onClick={handleSave} loading={isSaving}>저장</Button>
        </Group>

        <Stack gap="sm">
          <div>
            <Text size="sm" fw={500} mb={4}>의뢰인 포지션</Text>
            <SegmentedControl
              size="xs"
              value={form.clientPosition}
              onChange={(val) => h('clientPosition', val)}
              data={[
                { label: '원고 대리', value: 'plaintiff' },
                { label: '피고 대리', value: 'defendant' },
              ]}
            />
          </div>
          <SimpleGrid cols={2}>
            <TextInput label={form.clientPosition === 'plaintiff' ? '의뢰인(원고)' : '의뢰인(피고)'} value={form.clientName} onChange={(e) => h('clientName', e.currentTarget.value)} required />
            <TextInput label={form.clientPosition === 'plaintiff' ? '상대방(피고)' : '상대방(원고)'} value={form.opponent} onChange={(e) => h('opponent', e.currentTarget.value)} />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <TextInput label="사건번호" value={form.caseNumber} onChange={(e) => h('caseNumber', e.currentTarget.value)} />
            <Select label="사건 유형" data={CASE_TYPES} value={form.type} onChange={(val) => h('type', val)} />
          </SimpleGrid>

          <TextInput label="사건명" value={form.caseName} onChange={(e) => h('caseName', e.currentTarget.value)} />

          <SimpleGrid cols={2}>
            <TextInput label="법원" value={form.court} onChange={(e) => h('court', e.currentTarget.value)} />
            <TextInput label="재판부" value={form.division} onChange={(e) => h('division', e.currentTarget.value)} />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <Select label="상태" data={CASE_STATUSES} value={form.status} onChange={(val) => h('status', val)} />
            <div>
              <Text size="sm" fw={500} mb={4}>등록일</Text>
              <Text size="sm" c="dimmed">{caseData.openedAt || '-'}</Text>
            </div>
          </SimpleGrid>

          {caseData.nextHearingDate && (
            <div>
              <Text size="sm" fw={500} mb={4}>다음 기일</Text>
              <Group gap="xs">
                <Text size="sm">{new Date(caseData.nextHearingDate).toLocaleString('ko-KR')}</Text>
                {ddayText && (
                  <MantineBadge size="xs" variant="light" ff="monospace" color={dday <= 7 && dday >= 0 ? 'red' : dday < 0 ? 'gray' : 'indigo'}>
                    {ddayText}
                  </MantineBadge>
                )}
              </Group>
            </div>
          )}

          <TextInput label="태그" placeholder="손해배상, 계약 (쉼표로 구분)" value={form.tags} onChange={(e) => h('tags', e.currentTarget.value)} />

          <Textarea label="메모" placeholder="의뢰인 관련 메모 (선택)" minRows={2} autosize maxRows={4} value={form.clientMemo} onChange={(e) => h('clientMemo', e.currentTarget.value)} />
        </Stack>
      </Card>

      <Card padding="lg">
        <ContactList contacts={form.contacts} onChange={(contacts) => h('contacts', contacts)} />
        {!hasEmail && (
          <Text size="xs" c="orange" mt="sm">이메일을 입력하면 이메일 탭에서 관련 메일을 자동 검색합니다.</Text>
        )}
      </Card>
    </SimpleGrid>
    <CaseBillingSummary caseId={caseData.id} />
    </Stack>
  )
}

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentCase, loadCaseDetail, isLoading } = useCaseStore()
  const [activeTab, setActiveTab] = useState('info')
  const [showShareModal, setShowShareModal] = useState(false)

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
    <>
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
        <Container size="xl" py="sm">
          <Group gap="sm" mb="sm">
            <ActionIcon variant="subtle" color="gray" onClick={() => navigate('/cases')}>
              <IconArrowLeft size={18} />
            </ActionIcon>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs">
                <Text size="lg" fw={700} truncate>{currentCase.clientName}</Text>
                <Badge status={currentCase.status} />
                {currentCase.sharedWith?.length > 0 && (
                  <MantineBadge variant="light" size="xs" color="blue">공유중</MantineBadge>
                )}
              </Group>
              <Text size="sm" c="dimmed" ff="monospace">
                {currentCase.caseNumber || '\uC0AC\uAC74\uBC88\uD638 \uBBF8\uC815'}
                {currentCase.court && ` | ${currentCase.court}`}
                {currentCase.type && ` | ${currentCase.type}`}
              </Text>
            </div>
            <ActionIcon variant="light" color="blue" onClick={() => setShowShareModal(true)}>
              <IconShare size={16} />
            </ActionIcon>
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
      <Container size="xl" py="lg">
        {activeTab === 'info' && <InfoTab caseData={currentCase} />}
        {activeTab === 'consultation' && <ConsultRecordTab caseData={currentCase} />}
        {activeTab === 'hearings' && <HearingList caseData={currentCase} />}
        {activeTab === 'timeline' && <Timeline caseData={currentCase} />}
        {activeTab === 'email' && <EmailList caseData={currentCase} />}
        {activeTab === 'docs' && <DocumentList caseData={currentCase} />}
        {activeTab === 'billing' && <CaseBillingTab caseData={currentCase} />}
      </Container>

      <ShareCaseModal
        caseData={currentCase}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </>
  )
}
