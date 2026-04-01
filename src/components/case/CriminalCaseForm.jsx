import { useState } from 'react'
import {
  TextInput, Select, Textarea, Button, Group, Stack, SimpleGrid,
  Switch, Divider, Text, ActionIcon,
} from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'

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

const CASE_STATUSES = ['접수', '진행', '종결', '보류']

export default function CriminalCaseForm({ initialData, onSubmit, onCancel }) {
  const isEditing = !!initialData

  const [form, setForm] = useState({
    clientName: initialData?.clientName || '',
    clientEmail: initialData?.clientEmail || '',
    clientPhone: initialData?.clientPhone || '',
    opponent: initialData?.opponent || '',
    status: initialData?.status || '접수',
    court: initialData?.court || '',
    division: initialData?.division || '',
    tags: initialData?.tags?.join(', ') || '',
    // 형사 전용
    position: initialData?.criminalInfo?.position || 'defendant',
    currentStage: initialData?.criminalInfo?.currentStage || 'police',
    charges: initialData?.criminalInfo?.charges || '',
    detained: initialData?.criminalInfo?.detained || false,
    investigationAgency: initialData?.criminalInfo?.investigationAgency || '',
    investigatorName: initialData?.criminalInfo?.investigatorName || '',
    investigatorContact: initialData?.criminalInfo?.investigatorContact || '',
    policeCaseNumber: initialData?.criminalInfo?.policeCaseNumber || '',
    prosecutionCaseNumber: initialData?.criminalInfo?.prosecutionCaseNumber || '',
    caseNumber: initialData?.caseNumber || '',
    // 가족 연락처
    familyContacts: initialData?.familyContacts?.length > 0
      ? initialData.familyContacts
      : [{ name: '', phone: '', relation: '' }],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const h = (name, value) => setForm({ ...form, [name]: value })

  const handleFamilyChange = (index, field, value) => {
    const arr = [...form.familyContacts]
    arr[index] = { ...arr[index], [field]: value }
    setForm({ ...form, familyContacts: arr })
  }
  const handleFamilyAdd = () => {
    setForm({ ...form, familyContacts: [...form.familyContacts, { name: '', phone: '', relation: '' }] })
  }
  const handleFamilyRemove = (index) => {
    const arr = form.familyContacts.filter((_, i) => i !== index)
    setForm({ ...form, familyContacts: arr.length > 0 ? arr : [{ name: '', phone: '', relation: '' }] })
  }

  const positionLabels = form.position === 'defendant'
    ? { client: '피의자/피고인', opponent: '검사/피해자' }
    : { client: '고소인', opponent: '피고소인' }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.clientName.trim()) return
    setIsSubmitting(true)
    try {
      const familyContacts = form.familyContacts.filter((f) => f.name.trim() || f.phone.trim())
      const data = {
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone,
        opponent: form.opponent,
        type: '형사',
        status: form.status,
        court: form.court,
        division: form.division,
        caseNumber: form.caseNumber,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        familyContacts,
        criminalInfo: {
          position: form.position,
          currentStage: form.currentStage,
          charges: form.charges,
          detained: form.detained,
          investigationAgency: form.investigationAgency,
          investigatorName: form.investigatorName,
          investigatorContact: form.investigatorContact,
          policeCaseNumber: form.policeCaseNumber,
          prosecutionCaseNumber: form.prosecutionCaseNumber,
        },
      }
      if (!isEditing) {
        const year = new Date().getFullYear()
        data.id = `${year}-${String(Date.now()).slice(-4)}`
        data.openedAt = new Date().toISOString().split('T')[0]
        data.closedAt = null
        data.nextHearingDate = null
      }
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        {/* 의뢰인 포지션 */}
        <Select
          label="의뢰인 포지션"
          data={CRIMINAL_POSITIONS}
          value={form.position}
          onChange={(val) => h('position', val)}
          required
          withAsterisk
        />

        <SimpleGrid cols={2}>
          <TextInput
            label={positionLabels.client}
            placeholder="홍길동"
            required
            withAsterisk
            value={form.clientName}
            onChange={(e) => h('clientName', e.currentTarget.value)}
          />
          <TextInput
            label={positionLabels.opponent}
            placeholder="상대방"
            value={form.opponent}
            onChange={(e) => h('opponent', e.currentTarget.value)}
          />
        </SimpleGrid>

        <SimpleGrid cols={2}>
          <TextInput
            label="이메일"
            type="email"
            placeholder="client@example.com"
            value={form.clientEmail}
            onChange={(e) => h('clientEmail', e.currentTarget.value)}
          />
          <TextInput
            label="전화번호"
            placeholder="010-1234-5678"
            value={form.clientPhone}
            onChange={(e) => h('clientPhone', e.currentTarget.value)}
          />
        </SimpleGrid>

        {/* 가족 연락처 */}
        <Divider label="가족 연락처" labelPosition="left" />
        <div>
          <Group justify="space-between" mb={4}>
            <Text size="xs" c="dimmed">구속 시 연락할 가족 정보</Text>
            <Button variant="subtle" size="xs" leftSection={<IconPlus size={12} />} onClick={handleFamilyAdd}>추가</Button>
          </Group>
          <Stack gap={6}>
            {form.familyContacts.map((fc, i) => (
              <Group key={i} gap={4} wrap="nowrap">
                <TextInput size="sm" placeholder="이름" value={fc.name} onChange={(e) => handleFamilyChange(i, 'name', e.currentTarget.value)} style={{ flex: 1 }} />
                <TextInput size="sm" placeholder="010-0000-0000" value={fc.phone} onChange={(e) => handleFamilyChange(i, 'phone', e.currentTarget.value)} style={{ flex: 1 }} />
                <TextInput size="sm" placeholder="관계 (배우자, 부 등)" value={fc.relation} onChange={(e) => handleFamilyChange(i, 'relation', e.currentTarget.value)} style={{ flex: 1 }} />
                {form.familyContacts.length > 1 && (
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleFamilyRemove(i)}><IconTrash size={12} /></ActionIcon>
                )}
              </Group>
            ))}
          </Stack>
        </div>

        {/* 사건 정보 */}
        <Divider label="사건 정보" labelPosition="left" />

        <TextInput
          label="죄명(혐의)"
          placeholder="사기, 횡령 등"
          value={form.charges}
          onChange={(e) => h('charges', e.currentTarget.value)}
        />

        <SimpleGrid cols={2}>
          <Select
            label="현재 단계"
            data={CRIMINAL_STAGES}
            value={form.currentStage}
            onChange={(val) => h('currentStage', val)}
          />
          <Switch
            label="구속 여부"
            checked={form.detained}
            onChange={(e) => h('detained', e.currentTarget.checked)}
            mt={28}
          />
        </SimpleGrid>

        <SimpleGrid cols={2}>
          <TextInput
            label="사건번호(경찰)"
            placeholder="2026-형제-1234"
            value={form.policeCaseNumber}
            onChange={(e) => h('policeCaseNumber', e.currentTarget.value)}
          />
          <TextInput
            label="사건번호(검찰)"
            placeholder="2026형제12345"
            value={form.prosecutionCaseNumber}
            onChange={(e) => h('prosecutionCaseNumber', e.currentTarget.value)}
          />
        </SimpleGrid>

        <TextInput
          label="사건번호(법원)"
          placeholder="2026고단1234"
          value={form.caseNumber}
          onChange={(e) => h('caseNumber', e.currentTarget.value)}
        />

        {/* 수사기관 */}
        <Divider label="수사기관" labelPosition="left" />

        <SimpleGrid cols={2}>
          <TextInput
            label="수사기관"
            placeholder="수원남부경찰서"
            value={form.investigationAgency}
            onChange={(e) => h('investigationAgency', e.currentTarget.value)}
          />
          <TextInput
            label="담당 수사관"
            placeholder="홍길동 경사"
            value={form.investigatorName}
            onChange={(e) => h('investigatorName', e.currentTarget.value)}
          />
        </SimpleGrid>

        <TextInput
          label="수사관 연락처"
          placeholder="02-1234-5678"
          value={form.investigatorContact}
          onChange={(e) => h('investigatorContact', e.currentTarget.value)}
        />

        {/* 기타 */}
        <Divider label="기타" labelPosition="left" />

        <SimpleGrid cols={2}>
          <TextInput
            label="법원"
            placeholder="수원지방법원"
            value={form.court}
            onChange={(e) => h('court', e.currentTarget.value)}
          />
          <TextInput
            label="재판부"
            placeholder="형사1부"
            value={form.division}
            onChange={(e) => h('division', e.currentTarget.value)}
          />
        </SimpleGrid>

        {isEditing && (
          <Select label="상태" data={CASE_STATUSES} value={form.status} onChange={(val) => h('status', val)} />
        )}

        <TextInput
          label="태그"
          placeholder="사기, 횡령 (쉼표로 구분)"
          value={form.tags}
          onChange={(e) => h('tags', e.currentTarget.value)}
        />

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onCancel}>취소</Button>
          <Button type="submit" loading={isSubmitting} disabled={!form.clientName.trim()}>
            {isEditing ? '수정' : '등록'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
