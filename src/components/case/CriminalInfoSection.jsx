import { useState } from 'react'
import {
  Card, Group, Text, Button, Stack, SimpleGrid, TextInput, Select, Textarea,
  Badge as MantineBadge, Switch,
} from '@mantine/core'
import { IconEdit, IconCheck, IconX, IconShieldLock } from '@tabler/icons-react'
import { useCaseStore } from '../../store/caseStore'
import { useUiStore } from '../../store/uiStore'
import { readCaseDetail, writeCaseDetail } from '../../api/drive'
import CriminalStageBar from './CriminalStageBar'

const STAGES = [
  { value: 'police', label: '경찰 수사' },
  { value: 'prosecution', label: '검찰' },
  { value: 'indictment', label: '기소/불기소' },
  { value: 'trial', label: '재판' },
  { value: 'verdict', label: '판결' },
]

const POSITIONS = [
  { value: 'defendant', label: '피의자/피고인' },
  { value: 'complainant', label: '고소인(고소대리)' },
]

const INDICTMENT_RESULTS = [
  { value: 'indicted', label: '기소' },
  { value: 'not_indicted', label: '불기소' },
  { value: 'suspended', label: '기소유예' },
]

function positionLabel(position) {
  return position === 'defendant' ? '피의자/피고인' : position === 'complainant' ? '고소인' : '-'
}

function indictmentLabel(result) {
  if (!result) return '-'
  const found = INDICTMENT_RESULTS.find((r) => r.value === result)
  return found ? found.label : '-'
}

export default function CriminalInfoSection({ caseData }) {
  const { updateCase, loadCaseDetail } = useCaseStore()
  const { showToast } = useUiStore()
  const [editing, setEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const criminal = caseData.criminalInfo || {}

  const [form, setForm] = useState({})

  const startEdit = () => {
    setForm({
      position: criminal.position || 'defendant',
      currentStage: criminal.currentStage || 'police',
      charges: criminal.charges || '',
      investigationAgency: criminal.investigationAgency || '',
      investigatorName: criminal.investigatorName || '',
      investigatorContact: criminal.investigatorContact || '',
      detained: criminal.detained || false,
      bail: criminal.bail || '',
      policeCaseNumber: criminal.policeCaseNumber || '',
      prosecutionCaseNumber: criminal.prosecutionCaseNumber || '',
      indictmentResult: criminal.indictmentResult || null,
      verdictSummary: criminal.verdictSummary || '',
    })
    setEditing(true)
  }

  const cancelEdit = () => setEditing(false)

  const handleChange = (name, value) => setForm({ ...form, [name]: value })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const criminalInfo = { ...form }
      // save to case detail JSON
      const detail = await readCaseDetail(caseData.driveFileId)
      detail.criminalInfo = criminalInfo
      await writeCaseDetail(caseData.driveFileId, detail)
      // also save to cases.json index for card display
      await updateCase(caseData.id, { criminalInfo })
      await loadCaseDetail(caseData.id)
      setEditing(false)
      showToast('형사사건 정보가 수정되었습니다.', 'success')
    } catch (err) {
      showToast(`수정 실패: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  if (editing) {
    return (
      <Card padding="md">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconShieldLock size={16} />
            <Text size="sm" fw={600}>수사/공판 정보 수정</Text>
          </Group>
          <Group gap={4}>
            <Button size="xs" variant="subtle" color="gray" leftSection={<IconX size={14} />} onClick={cancelEdit}>
              취소
            </Button>
            <Button size="xs" leftSection={<IconCheck size={14} />} onClick={handleSave} loading={isSaving}>
              저장
            </Button>
          </Group>
        </Group>

        <Stack gap="sm">
          <SimpleGrid cols={2}>
            <Select
              label="현재 단계"
              data={STAGES}
              value={form.currentStage}
              onChange={(val) => handleChange('currentStage', val)}
            />
            <Select
              label="의뢰인 포지션"
              data={POSITIONS}
              value={form.position}
              onChange={(val) => handleChange('position', val)}
            />
          </SimpleGrid>

          <TextInput
            label="죄명(혐의)"
            placeholder="사기, 횡령 등"
            value={form.charges}
            onChange={(e) => handleChange('charges', e.currentTarget.value)}
          />

          <SimpleGrid cols={2}>
            <TextInput
              label="수사기관"
              placeholder="수원남부경찰서"
              value={form.investigationAgency}
              onChange={(e) => handleChange('investigationAgency', e.currentTarget.value)}
            />
            <TextInput
              label="담당 수사관"
              placeholder="홍길동 경사"
              value={form.investigatorName}
              onChange={(e) => handleChange('investigatorName', e.currentTarget.value)}
            />
          </SimpleGrid>

          <TextInput
            label="수사관 연락처"
            placeholder="02-1234-5678"
            value={form.investigatorContact}
            onChange={(e) => handleChange('investigatorContact', e.currentTarget.value)}
          />

          <SimpleGrid cols={2}>
            <Switch
              label="구속 여부"
              checked={form.detained}
              onChange={(e) => handleChange('detained', e.currentTarget.checked)}
              mt="md"
            />
            <TextInput
              label="보석 현황"
              placeholder="보석 허가 등"
              value={form.bail}
              onChange={(e) => handleChange('bail', e.currentTarget.value)}
              disabled={!form.detained}
            />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <TextInput
              label="사건번호(경찰)"
              placeholder="2026-형제-1234"
              value={form.policeCaseNumber}
              onChange={(e) => handleChange('policeCaseNumber', e.currentTarget.value)}
            />
            <TextInput
              label="사건번호(검찰)"
              placeholder="2026형제12345"
              value={form.prosecutionCaseNumber}
              onChange={(e) => handleChange('prosecutionCaseNumber', e.currentTarget.value)}
            />
          </SimpleGrid>

          <SimpleGrid cols={2}>
            <Select
              label="검찰 처분"
              data={INDICTMENT_RESULTS}
              value={form.indictmentResult}
              onChange={(val) => handleChange('indictmentResult', val)}
              clearable
              placeholder="미정"
            />
            <div />
          </SimpleGrid>

          <Textarea
            label="판결 요약"
            placeholder="판결 내용 요약 (선택)"
            minRows={2}
            autosize
            maxRows={4}
            value={form.verdictSummary}
            onChange={(e) => handleChange('verdictSummary', e.currentTarget.value)}
          />
        </Stack>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconShieldLock size={16} />
          <Text size="sm" fw={600}>수사/공판 정보</Text>
        </Group>
        <Button size="xs" variant="subtle" color="gray" leftSection={<IconEdit size={14} />} onClick={startEdit}>
          수정
        </Button>
      </Group>

      {criminal.currentStage && (
        <Card padding="sm" mb="md" bg="gray.0" radius="md">
          <CriminalStageBar currentStage={criminal.currentStage} />
        </Card>
      )}

      <Stack gap="sm">
        <SimpleGrid cols={2}>
          <div>
            <Text size="xs" c="dimmed">현재 단계</Text>
            <Text size="sm">{STAGES.find((s) => s.value === criminal.currentStage)?.label || '-'}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">의뢰인 포지션</Text>
            <Text size="sm">{positionLabel(criminal.position)}</Text>
          </div>
        </SimpleGrid>

        <div>
          <Text size="xs" c="dimmed">죄명(혐의)</Text>
          <Text size="sm">{criminal.charges || '-'}</Text>
        </div>

        <SimpleGrid cols={2}>
          <div>
            <Text size="xs" c="dimmed">수사기관</Text>
            <Text size="sm">{criminal.investigationAgency || '-'}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">담당 수사관</Text>
            <Text size="sm">
              {criminal.investigatorName || '-'}
              {criminal.investigatorContact && ` (${criminal.investigatorContact})`}
            </Text>
          </div>
        </SimpleGrid>

        <SimpleGrid cols={2}>
          <div>
            <Text size="xs" c="dimmed">구속 여부</Text>
            <Group gap="xs">
              {criminal.detained ? (
                <MantineBadge color="red" variant="filled" size="sm">구속중</MantineBadge>
              ) : (
                <Text size="sm">불구속</Text>
              )}
            </Group>
          </div>
          <div>
            <Text size="xs" c="dimmed">보석 현황</Text>
            <Text size="sm">{criminal.bail || '-'}</Text>
          </div>
        </SimpleGrid>

        <SimpleGrid cols={2}>
          <div>
            <Text size="xs" c="dimmed">사건번호(경찰)</Text>
            <Text size="sm" ff="monospace">{criminal.policeCaseNumber || '-'}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed">사건번호(검찰)</Text>
            <Text size="sm" ff="monospace">{criminal.prosecutionCaseNumber || '-'}</Text>
          </div>
        </SimpleGrid>

        {criminal.indictmentResult && (
          <div>
            <Text size="xs" c="dimmed">검찰 처분</Text>
            <Text size="sm">{indictmentLabel(criminal.indictmentResult)}</Text>
          </div>
        )}

        {criminal.verdictSummary && (
          <div>
            <Text size="xs" c="dimmed">판결 요약</Text>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{criminal.verdictSummary}</Text>
          </div>
        )}

        {!criminal.currentStage && (
          <Text size="xs" c="orange" ta="center" py="sm">
            형사사건 정보가 입력되지 않았습니다. [수정] 버튼을 눌러 입력하세요.
          </Text>
        )}
      </Stack>
    </Card>
  )
}
