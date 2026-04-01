import { useState } from 'react'
import { TextInput, Select, Textarea, Button, Group, Stack, SimpleGrid, SegmentedControl, Text } from '@mantine/core'
import { parseCourtCase } from '../../utils/courtCaseParser'

const CASE_TYPES = ['민사', '가사', '행정', '기타']
const CASE_STATUSES = ['접수', '진행', '종결', '보류']

export default function CaseForm({ initialData, onSubmit, onCancel }) {
  const isEditing = !!initialData

  const [form, setForm] = useState({
    caseNumber: initialData?.caseNumber || '',
    caseName: initialData?.caseName || '',
    clientName: initialData?.clientName || '',
    clientEmail: initialData?.clientEmail || '',
    clientPhone: initialData?.clientPhone || '',
    opponent: initialData?.opponent || '',
    type: initialData?.type || '민사',
    status: initialData?.status || '접수',
    court: initialData?.court || '',
    division: initialData?.division || '',
    tags: initialData?.tags?.join(', ') || '',
    clientPosition: initialData?.clientPosition || 'plaintiff',
  })

  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (name, value) => {
    setForm({ ...form, [name]: value })
  }

  const handlePaste = () => {
    if (!pasteText.trim()) return
    const parsed = parseCourtCase(pasteText)
    if (!parsed) {
      alert('법원 사건 정보를 인식할 수 없습니다. 사건검색 결과를 그대로 붙여넣기 해주세요.')
      return
    }
    setForm({
      ...form,
      caseNumber: parsed.caseNumber || form.caseNumber,
      caseName: parsed.caseName || form.caseName,
      clientName: parsed.clientName || form.clientName,
      opponent: parsed.opponent || form.opponent,
      type: parsed.type || form.type,
      status: parsed.status || form.status,
      court: parsed.court || form.court,
      division: parsed.division || form.division,
    })
    setShowPaste(false)
    setPasteText('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.clientName.trim()) return

    setIsSubmitting(true)
    try {
      const data = {
        ...form,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
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
        {!isEditing && (
          <>
            {!showPaste ? (
              <Button
                variant="default"
                fullWidth
                style={{ borderStyle: 'dashed', borderColor: 'var(--mantine-color-indigo-3)' }}
                onClick={() => setShowPaste(true)}
              >
                법원 사건검색 결과 붙여넣기로 자동입력
              </Button>
            ) : (
              <Stack gap="xs">
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.currentTarget.value)}
                  placeholder="법원 사건검색 결과를 여기에 붙여넣기 하세요..."
                  minRows={4}
                  autoFocus
                />
                <Group justify="flex-end" gap="xs">
                  <Button variant="subtle" size="xs" onClick={() => { setShowPaste(false); setPasteText('') }}>취소</Button>
                  <Button size="xs" onClick={handlePaste} disabled={!pasteText.trim()}>자동 채우기</Button>
                </Group>
              </Stack>
            )}
          </>
        )}

        <div>
          <Text size="sm" fw={500} mb={4}>의뢰인 포지션</Text>
          <SegmentedControl
            size="xs"
            value={form.clientPosition}
            onChange={(val) => handleChange('clientPosition', val)}
            data={[
              { label: '원고 대리', value: 'plaintiff' },
              { label: '피고 대리', value: 'defendant' },
            ]}
          />
        </div>

        <TextInput
          label={form.clientPosition === 'plaintiff' ? '의뢰인(원고)' : '의뢰인(피고)'}
          placeholder="홍길동"
          required
          withAsterisk
          value={form.clientName}
          onChange={(e) => handleChange('clientName', e.currentTarget.value)}
        />

        <TextInput
          label={form.clientPosition === 'plaintiff' ? '상대방(피고)' : '상대방(원고)'}
          placeholder="상대방"
          value={form.opponent}
          onChange={(e) => handleChange('opponent', e.currentTarget.value)}
        />

        <SimpleGrid cols={2}>
          <TextInput
            label="사건번호"
            placeholder="2026가합12345"
            value={form.caseNumber}
            onChange={(e) => handleChange('caseNumber', e.currentTarget.value)}
          />
          <Select
            label="사건 유형"
            data={CASE_TYPES}
            value={form.type}
            onChange={(val) => handleChange('type', val)}
          />
        </SimpleGrid>

        <TextInput
          label="사건명"
          placeholder="손해배상(기)"
          value={form.caseName}
          onChange={(e) => handleChange('caseName', e.currentTarget.value)}
        />

        <SimpleGrid cols={2}>
          <TextInput
            label="법원"
            placeholder="서울중앙지방법원"
            value={form.court}
            onChange={(e) => handleChange('court', e.currentTarget.value)}
          />
          <TextInput
            label="재판부"
            placeholder="제1민사부"
            value={form.division}
            onChange={(e) => handleChange('division', e.currentTarget.value)}
          />
        </SimpleGrid>

        <SimpleGrid cols={2}>
          <TextInput
            label="이메일"
            type="email"
            placeholder="client@example.com"
            value={form.clientEmail}
            onChange={(e) => handleChange('clientEmail', e.currentTarget.value)}
          />
          <TextInput
            label="전화번호"
            placeholder="010-1234-5678"
            value={form.clientPhone}
            onChange={(e) => handleChange('clientPhone', e.currentTarget.value)}
          />
        </SimpleGrid>

        {isEditing && (
          <Select
            label="상태"
            data={CASE_STATUSES}
            value={form.status}
            onChange={(val) => handleChange('status', val)}
          />
        )}

        <TextInput
          label="태그"
          placeholder="손해배상, 계약 (쉼표로 구분)"
          value={form.tags}
          onChange={(e) => handleChange('tags', e.currentTarget.value)}
        />

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onCancel}>취소</Button>
          <Button type="submit" loading={isSubmitting} disabled={!form.clientName.trim()}>
            {isEditing ? '수정' : '생성'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
