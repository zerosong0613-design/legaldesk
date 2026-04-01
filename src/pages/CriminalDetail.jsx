import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Group, Text, ActionIcon, Tabs, Center, Loader,
  Container, Stack, Box, Card, SimpleGrid, Badge as MantineBadge,
  TextInput, Textarea, Select, Button, Switch, Divider,
} from '@mantine/core'
import {
  IconArrowLeft, IconTimeline, IconCalendarEvent, IconMessageCircle,
  IconMail, IconFiles, IconInfoCircle, IconCheck, IconReceipt,
  IconPlus, IconTrash, IconShieldLock,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import Badge from '../components/ui/Badge'
import HearingList from '../components/case/HearingList'
import Timeline from '../components/case/Timeline'
import EmailList from '../components/case/EmailList'
import DocumentList from '../components/case/DocumentList'
import ConsultRecordTab from '../components/case/ConsultRecordTab'
import CriminalStageBar from '../components/case/CriminalStageBar'
import CaseBillingSummary from '../components/case/CaseBillingSummary'
import CaseBillingTab from '../components/case/CaseBillingTab'
import ContactList, { migrateContacts } from '../components/case/ContactList'
import { readCaseDetail, writeCaseDetail } from '../api/drive'
import { getDday } from '../utils/dateUtils'

const CRIMINAL_POSITIONS = [
  { value: 'defendant', label: '피의자/피고인' },
  { value: 'complainant', label: '고소인(고소대리)' },
]
const CRIMINAL_STAGES = [
  { value: 'police', label: '경찰 수사' },
  { value: 'prosecution', label: '검찰' },
  { value: 'indictment', label: '기소/불기소' },
  { value: 'trial', label: '재판' },
  { value: 'verdict', label: '판결' },
]
const INDICTMENT_RESULTS = [
  { value: 'indicted', label: '기소' },
  { value: 'not_indicted', label: '불기소' },
  { value: 'suspended', label: '기소유예' },
]
const CASE_STATUSES = ['접수', '진행', '종결', '보류']

const TABS_LIST = [
  { id: 'info', label: '사건정보', icon: IconInfoCircle },
  { id: 'consultation', label: '상담', icon: IconMessageCircle },
  { id: 'hearings', label: '기일', icon: IconCalendarEvent },
  { id: 'timeline', label: '타임라인', icon: IconTimeline },
  { id: 'email', label: '이메일', icon: IconMail },
  { id: 'docs', label: '문서', icon: IconFiles },
  { id: 'billing', label: '비용', icon: IconReceipt },
]

function InfoTab({ caseData }) {
  const { updateCase, loadCaseDetail } = useCaseStore()
  const { showToast } = useUiStore()
  const [isSaving, setIsSaving] = useState(false)

  const criminal = caseData.criminalInfo || {}

  const [form, setForm] = useState({
    clientName: caseData.clientName || '',
    opponent: caseData.opponent || '',
    status: caseData.status || '접수',
    court: caseData.court || '',
    division: caseData.division || '',
    caseNumber: caseData.caseNumber || '',
    tags: caseData.tags?.join(', ') || '',
    // 형사 전용
    position: criminal.position || 'defendant',
    currentStage: criminal.currentStage || 'police',
    charges: criminal.charges || '',
    detained: criminal.detained || false,
    bail: criminal.bail || '',
    investigationAgency: criminal.investigationAgency || '',
    investigatorName: criminal.investigatorName || '',
    investigatorContact: criminal.investigatorContact || '',
    policeCaseNumber: criminal.policeCaseNumber || '',
    prosecutionCaseNumber: criminal.prosecutionCaseNumber || '',
    indictmentResult: criminal.indictmentResult || null,
    verdictSummary: criminal.verdictSummary || '',
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
      const criminalInfo = {
        position: form.position,
        currentStage: form.currentStage,
        charges: form.charges,
        detained: form.detained,
        bail: form.bail,
        investigationAgency: form.investigationAgency,
        investigatorName: form.investigatorName,
        investigatorContact: form.investigatorContact,
        policeCaseNumber: form.policeCaseNumber,
        prosecutionCaseNumber: form.prosecutionCaseNumber,
        indictmentResult: form.indictmentResult,
        verdictSummary: form.verdictSummary,
      }
      const data = {
        clientName: form.clientName,
        opponent: form.opponent,
        status: form.status,
        court: form.court,
        division: form.division,
        caseNumber: form.caseNumber,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        contacts,
        criminalInfo,
        clientEmail: mainContact.email || '',
        clientPhone: mainContact.phone || '',
        clientEmails: allEmails,
        clientPhones: allPhones,
      }
      // save criminalInfo to detail JSON too
      const detail = await readCaseDetail(caseData.driveFileId)
      detail.criminalInfo = criminalInfo
      await writeCaseDetail(caseData.driveFileId, detail)
      await updateCase(caseData.id, data)
      await loadCaseDetail(caseData.id)
      showToast('사건 정보가 저장되었습니다.', 'success')
    } catch (err) {
      showToast(`저장 실패: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const positionLabels = form.position === 'defendant'
    ? { client: '피의자/피고인', opponent: '검사/피해자' }
    : { client: '고소인', opponent: '피고소인' }

  return (
    <Stack gap="md">
      {/* 단계 진행 바 */}
      <Card padding="md" bg="gray.0">
        <CriminalStageBar currentStage={form.currentStage} />
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {/* 왼쪽: 사건 정보 + 수사 정보 */}
        <Stack gap="md">
          <Card padding="lg">
            <Group justify="space-between" mb="md">
              <Group gap="xs">
                <IconShieldLock size={16} />
                <Text size="sm" fw={600}>사건 정보</Text>
              </Group>
              <Button size="xs" leftSection={<IconCheck size={14} />} onClick={handleSave} loading={isSaving}>저장</Button>
            </Group>

            <Stack gap="sm">
              <Select label="의뢰인 포지션" data={CRIMINAL_POSITIONS} value={form.position} onChange={(val) => h('position', val)} />

              <SimpleGrid cols={2}>
                <TextInput label={positionLabels.client} value={form.clientName} onChange={(e) => h('clientName', e.currentTarget.value)} required />
                <TextInput label={positionLabels.opponent} value={form.opponent} onChange={(e) => h('opponent', e.currentTarget.value)} />
              </SimpleGrid>

              <TextInput label="죄명(혐의)" value={form.charges} onChange={(e) => h('charges', e.currentTarget.value)} />

              <SimpleGrid cols={2}>
                <Select label="현재 단계" data={CRIMINAL_STAGES} value={form.currentStage} onChange={(val) => h('currentStage', val)} />
                <Select label="상태" data={CASE_STATUSES} value={form.status} onChange={(val) => h('status', val)} />
              </SimpleGrid>

              <SimpleGrid cols={2}>
                <Switch label="구속 여부" checked={form.detained} onChange={(e) => h('detained', e.currentTarget.checked)} mt={8} />
                <TextInput label="보석 현황" value={form.bail} onChange={(e) => h('bail', e.currentTarget.value)} disabled={!form.detained} />
              </SimpleGrid>

              <Divider label="사건번호" labelPosition="left" mt="xs" />
              <SimpleGrid cols={2}>
                <TextInput label="경찰" value={form.policeCaseNumber} onChange={(e) => h('policeCaseNumber', e.currentTarget.value)} />
                <TextInput label="검찰" value={form.prosecutionCaseNumber} onChange={(e) => h('prosecutionCaseNumber', e.currentTarget.value)} />
              </SimpleGrid>
              <TextInput label="법원" value={form.caseNumber} onChange={(e) => h('caseNumber', e.currentTarget.value)} />

              <Divider label="수사기관" labelPosition="left" mt="xs" />
              <SimpleGrid cols={2}>
                <TextInput label="수사기관" value={form.investigationAgency} onChange={(e) => h('investigationAgency', e.currentTarget.value)} />
                <TextInput label="담당 수사관" value={form.investigatorName} onChange={(e) => h('investigatorName', e.currentTarget.value)} />
              </SimpleGrid>
              <TextInput label="수사관 연락처" value={form.investigatorContact} onChange={(e) => h('investigatorContact', e.currentTarget.value)} />

              <Divider label="처분/판결" labelPosition="left" mt="xs" />
              <Select label="검찰 처분" data={INDICTMENT_RESULTS} value={form.indictmentResult} onChange={(val) => h('indictmentResult', val)} clearable placeholder="미정" />
              <Textarea label="판결 요약" value={form.verdictSummary} onChange={(e) => h('verdictSummary', e.currentTarget.value)} minRows={2} autosize />

              <SimpleGrid cols={2}>
                <TextInput label="법원" value={form.court} onChange={(e) => h('court', e.currentTarget.value)} />
                <TextInput label="재판부" value={form.division} onChange={(e) => h('division', e.currentTarget.value)} />
              </SimpleGrid>

              <TextInput label="태그" placeholder="사기, 횡령 (쉼표로 구분)" value={form.tags} onChange={(e) => h('tags', e.currentTarget.value)} />
            </Stack>
          </Card>
        </Stack>

        {/* 오른쪽: 연락처 */}
        <Stack gap="md">
          <Card padding="lg">
            <ContactList contacts={form.contacts} onChange={(contacts) => h('contacts', contacts)} />
          </Card>

          <CaseBillingSummary caseId={caseData.id} />
        </Stack>
      </SimpleGrid>
    </Stack>
  )
}

export default function CriminalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentCase, loadCaseDetail, isLoading } = useCaseStore()
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    loadCaseDetail(id)
  }, [id, loadCaseDetail])

  if (isLoading || !currentCase) {
    return <Center mih="100vh" bg="#f0f2f5"><Loader color="red" size="md" /></Center>
  }

  const criminal = currentCase.criminalInfo || {}
  const stageLabel = CRIMINAL_STAGES.find((s) => s.value === criminal.currentStage)?.label || ''

  return (
    <>
      <Box bg="white" style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Container size="xl" py="sm">
          <Group gap="sm" mb="sm">
            <ActionIcon variant="subtle" color="gray" onClick={() => navigate('/criminal')}>
              <IconArrowLeft size={18} />
            </ActionIcon>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs">
                <Text size="lg" fw={700} truncate>{currentCase.clientName}</Text>
                <Badge status={currentCase.status} />
                <MantineBadge size="xs" variant="light" color="indigo">{stageLabel}</MantineBadge>
                {criminal.detained && <MantineBadge size="xs" variant="filled" color="red">구속중</MantineBadge>}
              </Group>
              <Text size="sm" c="dimmed" ff="monospace">
                {currentCase.caseNumber || criminal.policeCaseNumber || '사건번호 미정'}
                {criminal.charges && ` | ${criminal.charges}`}
                {currentCase.court && ` | ${currentCase.court}`}
              </Text>
            </div>
          </Group>

          <Tabs value={activeTab} onChange={setActiveTab} variant="default">
            <Tabs.List>
              {TABS_LIST.map((tab) => (
                <Tabs.Tab key={tab.id} value={tab.id} leftSection={<tab.icon size={14} />}>{tab.label}</Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs>
        </Container>
      </Box>

      <Container size="xl" py="lg">
        {activeTab === 'info' && <InfoTab caseData={currentCase} />}
        {activeTab === 'consultation' && <ConsultRecordTab caseData={currentCase} />}
        {activeTab === 'hearings' && <HearingList caseData={currentCase} />}
        {activeTab === 'timeline' && <Timeline caseData={currentCase} />}
        {activeTab === 'email' && <EmailList caseData={currentCase} />}
        {activeTab === 'docs' && <DocumentList caseData={currentCase} />}
        {activeTab === 'billing' && <CaseBillingTab caseData={currentCase} />}
      </Container>
    </>
  )
}
