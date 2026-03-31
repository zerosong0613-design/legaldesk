import { useState } from 'react'
import {
  TextInput, Textarea, Button, Group, Stack, Text,
  UnstyledButton, Box,
} from '@mantine/core'

const METHODS = [
  { value: 'visit', label: '방문', icon: '🏢' },
  { value: 'call', label: '전화', icon: '📞' },
  { value: 'video', label: '화상', icon: '🎥' },
  { value: 'kakao', label: '카톡', icon: '💛' },
  { value: 'other', label: '기타', icon: '💬' },
]

const STATUSES = [
  { value: 'reviewing', label: '검토중', color: 'var(--mantine-color-yellow-6)' },
  { value: 'done', label: '완료', color: 'var(--mantine-color-green-6)' },
  { value: 'followup', label: '후속필요', color: 'var(--mantine-color-red-6)' },
]

function getTodayDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCurrentTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ConsultRecordForm({ initialData, onSubmit, onCancel }) {
  const isEditing = !!initialData

  const [form, setForm] = useState({
    date: initialData?.date || getTodayDate(),
    time: initialData?.time || getCurrentTime(),
    method: initialData?.method || 'call',
    content: initialData?.content || '',
    clientRequest: initialData?.clientRequest || '',
    status: initialData?.status || 'reviewing',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (name, value) => setForm({ ...form, [name]: value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.content.trim()) return

    setIsSubmitting(true)
    try {
      const data = { ...form }
      if (!isEditing) {
        data.id = `cr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        data.createdAt = new Date().toISOString()
      }
      data.updatedAt = new Date().toISOString()
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isKakao = form.method === 'kakao'

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Group grow>
          <TextInput
            label="상담일"
            type="date"
            required
            value={form.date}
            onChange={(e) => handleChange('date', e.currentTarget.value)}
          />
          <TextInput
            label="시간"
            type="time"
            required
            value={form.time}
            onChange={(e) => handleChange('time', e.currentTarget.value)}
          />
        </Group>

        <div>
          <Text size="sm" fw={500} mb={4}>상담 방식</Text>
          <Group gap={6}>
            {METHODS.map((m) => (
              <UnstyledButton
                key={m.value}
                onClick={() => handleChange('method', m.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${form.method === m.value ? 'var(--mantine-color-indigo-5)' : 'var(--mantine-color-gray-3)'}`,
                  background: form.method === m.value ? 'var(--mantine-color-indigo-0)' : 'white',
                  fontSize: 13,
                }}
              >
                {m.icon} {m.label}
              </UnstyledButton>
            ))}
          </Group>
        </div>

        <div>
          <Textarea
            label="상담 내용"
            required
            withAsterisk
            minRows={6}
            autosize
            maxRows={12}
            placeholder={isKakao ? '카카오톡 대화 내용을 붙여넣기 하세요' : 'STT 변환 텍스트 붙여넣기 또는 직접 입력'}
            value={form.content}
            onChange={(e) => handleChange('content', e.currentTarget.value)}
          />
          {isKakao && (
            <Text size="xs" c="dimmed" mt={2}>
              카카오톡 대화를 복사해서 붙여넣으세요
            </Text>
          )}
        </div>

        <Textarea
          label="의뢰인 요청사항 (선택)"
          minRows={3}
          autosize
          maxRows={6}
          value={form.clientRequest}
          onChange={(e) => handleChange('clientRequest', e.currentTarget.value)}
        />

        <div>
          <Text size="sm" fw={500} mb={4}>처리 상태</Text>
          <Group gap={6}>
            {STATUSES.map((s) => (
              <UnstyledButton
                key={s.value}
                onClick={() => handleChange('status', s.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: `1.5px solid ${form.status === s.value ? s.color : 'var(--mantine-color-gray-3)'}`,
                  background: form.status === s.value ? `${s.color}11` : 'white',
                  fontSize: 13,
                }}
              >
                {form.status === s.value && (
                  <Box
                    component="span"
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: s.color,
                      marginRight: 6,
                    }}
                  />
                )}
                {s.label}
              </UnstyledButton>
            ))}
          </Group>
        </div>

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onCancel}>취소</Button>
          <Button type="submit" loading={isSubmitting} disabled={!form.content.trim()}>
            {isEditing ? '수정' : '저장'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
