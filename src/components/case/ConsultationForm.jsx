import { useState } from 'react'
import { TextInput, Select, Button, Group, Stack, SimpleGrid } from '@mantine/core'

const CONSULT_TYPES = ['계약검토', '법률의견서', '규정자문', '일반상담', '기타']
const CONSULT_STATUSES = ['접수', '진행', '완료', '보류']

export default function ConsultationForm({ initialData, onSubmit, onCancel }) {
  const isEditing = !!initialData

  const [form, setForm] = useState({
    clientName: initialData?.clientName || '',
    clientEmail: initialData?.clientEmail || '',
    clientPhone: initialData?.clientPhone || '',
    type: initialData?.type || '계약검토',
    status: initialData?.status || '접수',
    subject: initialData?.subject || '',
    deadline: initialData?.deadline || '',
    tags: initialData?.tags?.join(', ') || '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (name, value) => {
    setForm({ ...form, [name]: value })
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
        data.id = `C-${year}-${String(Date.now()).slice(-4)}`
        data.openedAt = new Date().toISOString().split('T')[0]
        data.closedAt = null
      }
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <TextInput
          label="의뢰인"
          placeholder="홍길동 / 주식회사 테크"
          required
          withAsterisk
          value={form.clientName}
          onChange={(e) => handleChange('clientName', e.currentTarget.value)}
        />

        <SimpleGrid cols={2}>
          <Select
            label="자문 유형"
            data={CONSULT_TYPES}
            value={form.type}
            onChange={(val) => handleChange('type', val)}
          />
          <TextInput
            label="마감일"
            type="date"
            value={form.deadline}
            onChange={(e) => handleChange('deadline', e.currentTarget.value)}
          />
        </SimpleGrid>

        <TextInput
          label="자문 주제"
          placeholder="공급 계약서 리뷰"
          value={form.subject}
          onChange={(e) => handleChange('subject', e.currentTarget.value)}
        />

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
            data={CONSULT_STATUSES}
            value={form.status}
            onChange={(val) => handleChange('status', val)}
          />
        )}

        <TextInput
          label="태그"
          placeholder="계약, 공급 (쉼표로 구분)"
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
