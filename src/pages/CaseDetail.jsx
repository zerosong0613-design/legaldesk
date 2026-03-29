import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Group, Text, ActionIcon, Tabs, Center, Loader,
  Container, Stack, Box, Card, SimpleGrid, Badge as MantineBadge,
  TextInput, Select, Button,
} from '@mantine/core'
import {
  IconArrowLeft, IconTimeline, IconCalendarEvent, IconMessageCircle,
  IconMail, IconFiles, IconInfoCircle, IconEdit, IconCheck, IconX,
  IconPlus, IconTrash,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import Badge from '../components/ui/Badge'
import HearingList from '../components/case/HearingList'
import KakaoParser from '../components/case/KakaoParser'
import Timeline from '../components/case/Timeline'
import EmailList from '../components/case/EmailList'
import DocumentList from '../components/case/DocumentList'
import { getDday } from '../utils/dateUtils'

const CASE_TYPES = ['\uBBFC\uC0AC', '\uD615\uC0AC', '\uAC00\uC0AC', '\uD589\uC815', '\uAE30\uD0C0']
const CASE_STATUSES = ['\uC811\uC218', '\uC9C4\uD589', '\uC885\uACB0', '\uBCF4\uB958']

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
  const { showToast } = useUiStore()
  const [editing, setEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({})

  // normalize emails/phones: support both old string and new array format
  function toArray(val) {
    if (Array.isArray(val)) return val.length > 0 ? val : ['']
    if (val) return [val]
    return ['']
  }

  const startEdit = () => {
    setForm({
      clientName: caseData.clientName || '',
      opponent: caseData.opponent || '',
      caseNumber: caseData.caseNumber || '',
      caseName: caseData.caseName || '',
      type: caseData.type || '\uBBFC\uC0AC',
      status: caseData.status || '\uC811\uC218',
      court: caseData.court || '',
      division: caseData.division || '',
      clientEmails: toArray(caseData.clientEmails || caseData.clientEmail),
      clientPhones: toArray(caseData.clientPhones || caseData.clientPhone),
      tags: caseData.tags?.join(', ') || '',
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
        // keep backward compat: first value as single field
        clientEmail: emails[0] || '',
        clientPhone: phones[0] || '',
      }
      delete data.clientEmails
      delete data.clientPhones
      // save both formats
      data.clientEmails = emails
      data.clientPhones = phones
      await updateCase(caseData.id, data)
      await loadCaseDetail(caseData.id)
      setEditing(false)
      showToast('\uC0AC\uAC74 \uC815\uBCF4\uAC00 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
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

  const dday = getDday(caseData.nextHearingDate)
  const ddayText = dday === null ? null : dday === 0 ? 'D-Day' : dday > 0 ? `D-${dday}` : `D+${Math.abs(dday)}`

  if (editing) {
    return (
      <Card padding="md">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={600}>{'\uC0AC\uAC74 \uC815\uBCF4 \uC218\uC815'}</Text>
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
              label={'\uC758\uB8B0\uC778(\uC6D0\uACE0)'}
              value={form.clientName}
              onChange={(e) => handleChange('clientName', e.currentTarget.value)}
              required
            />
            <TextInput
              label={'\uC0C1\uB300\uBC29(\uD53C\uACE0)'}
              value={form.opponent}
              onChange={(e) => handleChange('opponent', e.currentTarget.value)}
            />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <TextInput
              label={'\uC0AC\uAC74\uBC88\uD638'}
              value={form.caseNumber}
              onChange={(e) => handleChange('caseNumber', e.currentTarget.value)}
            />
            <Select
              label={'\uC0AC\uAC74 \uC720\uD615'}
              data={CASE_TYPES}
              value={form.type}
              onChange={(val) => handleChange('type', val)}
            />
          </SimpleGrid>

          <TextInput
            label={'\uC0AC\uAC74\uBA85'}
            value={form.caseName}
            onChange={(e) => handleChange('caseName', e.currentTarget.value)}
          />

          <SimpleGrid cols={2}>
            <TextInput
              label={'\uBC95\uC6D0'}
              value={form.court}
              onChange={(e) => handleChange('court', e.currentTarget.value)}
            />
            <TextInput
              label={'\uC7AC\uD310\uBD80'}
              value={form.division}
              onChange={(e) => handleChange('division', e.currentTarget.value)}
            />
          </SimpleGrid>

          <Select
            label={'\uC0C1\uD0DC'}
            data={CASE_STATUSES}
            value={form.status}
            onChange={(val) => handleChange('status', val)}
          />

          {/* Multiple emails */}
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

          {/* Multiple phones */}
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
                    placeholder="010-1234-5678"
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
            placeholder={'\uC190\uD574\uBC30\uC0C1, \uACC4\uC57D (\uC274\uD45C\uB85C \uAD6C\uBD84)'}
            value={form.tags}
            onChange={(e) => handleChange('tags', e.currentTarget.value)}
          />
        </Stack>
      </Card>
    )
  }

  return (
    <Stack gap="md">
      <Card padding="md">
        <Group justify="space-between" mb="md">
          <Text size="sm" fw={600}>{'\uC0AC\uAC74 \uC815\uBCF4'}</Text>
          <Button size="xs" variant="subtle" color="gray" leftSection={<IconEdit size={14} />} onClick={startEdit}>
            {'\uC218\uC815'}
          </Button>
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
                    size="xs" variant="light" ff="monospace"
                    color={dday <= 7 && dday >= 0 ? 'red' : dday < 0 ? 'gray' : 'indigo'}
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
                  <MantineBadge key={tag} variant="light" color="gray" size="xs">{tag}</MantineBadge>
                ))}
              </Group>
            </div>
          )}
        </Stack>
      </Card>

      <Card padding="md">
        <Text size="sm" fw={600} mb="md">{'\uC5F0\uB77D\uCC98'}</Text>
        <Stack gap="sm">
          <SimpleGrid cols={2}>
            <div>
              <Text size="xs" c="dimmed">{'\uC774\uBA54\uC77C'}</Text>
              {(() => {
                const emails = caseData.clientEmails?.length > 0 ? caseData.clientEmails : (caseData.clientEmail ? [caseData.clientEmail] : [])
                return emails.length > 0
                  ? emails.map((e, i) => <Text key={i} size="sm">{e}</Text>)
                  : <Text size="sm">-</Text>
              })()}
            </div>
            <div>
              <Text size="xs" c="dimmed">{'\uC804\uD654\uBC88\uD638'}</Text>
              {(() => {
                const phones = caseData.clientPhones?.length > 0 ? caseData.clientPhones : (caseData.clientPhone ? [caseData.clientPhone] : [])
                return phones.length > 0
                  ? phones.map((p, i) => <Text key={i} size="sm">{p}</Text>)
                  : <Text size="sm">-</Text>
              })()}
            </div>
          </SimpleGrid>
          {!caseData.clientEmail && !(caseData.clientEmails?.length > 0) && (
            <Text size="xs" c="orange">
              {'\uC758\uB8B0\uC778 \uC774\uBA54\uC77C\uC744 \uC785\uB825\uD558\uBA74 \uC774\uBA54\uC77C \uD0ED\uC5D0\uC11C \uAD00\uB828 \uBA54\uC77C\uC744 \uC790\uB3D9 \uAC80\uC0C9\uD569\uB2C8\uB2E4.'}
            </Text>
          )}
        </Stack>
      </Card>
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

    </>
  )
}
