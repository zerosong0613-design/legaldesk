import { useState } from 'react'
import {
  TextInput, Select, Button, Group, Stack, SimpleGrid,
  Checkbox, Textarea,
} from '@mantine/core'

const SCHEDULE_TYPES = ['개인', '미팅', '업무', '기타']

function toLocalDatetime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toLocalDate(isoStr) {
  if (!isoStr) return ''
  return isoStr.slice(0, 10)
}

export default function ScheduleForm({ initialData, onSubmit, onCancel, onDelete }) {
  const isEditing = !!initialData

  const [form, setForm] = useState({
    title: initialData?.title || '',
    type: initialData?.type || '미팅',
    datetime: initialData?.allDay
      ? toLocalDate(initialData?.datetime)
      : toLocalDatetime(initialData?.datetime) || '',
    endDatetime: initialData?.allDay
      ? toLocalDate(initialData?.endDatetime)
      : toLocalDatetime(initialData?.endDatetime) || '',
    allDay: initialData?.allDay || false,
    location: initialData?.location || '',
    note: initialData?.note || '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAllDayToggle = (checked) => {
    setForm((prev) => ({
      ...prev,
      allDay: checked,
      datetime: checked ? toLocalDate(prev.datetime) : toLocalDatetime(prev.datetime || new Date().toISOString()),
      endDatetime: checked ? toLocalDate(prev.endDatetime) : toLocalDatetime(prev.endDatetime),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.datetime) return

    setIsSubmitting(true)
    try {
      const data = {
        title: form.title.trim(),
        type: form.type,
        datetime: form.allDay ? form.datetime : new Date(form.datetime).toISOString(),
        endDatetime: form.endDatetime
          ? (form.allDay ? form.endDatetime : new Date(form.endDatetime).toISOString())
          : null,
        allDay: form.allDay,
        location: form.location.trim(),
        note: form.note.trim(),
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
          label="제목"
          placeholder="의뢰인 미팅, 세미나 참석 등"
          required
          withAsterisk
          value={form.title}
          onChange={(e) => handleChange('title', e.currentTarget.value)}
        />

        <SimpleGrid cols={2}>
          <Select
            label="유형"
            data={SCHEDULE_TYPES}
            value={form.type}
            onChange={(val) => handleChange('type', val)}
          />
          <TextInput
            label="장소"
            placeholder="사무실, 법원 등"
            value={form.location}
            onChange={(e) => handleChange('location', e.currentTarget.value)}
          />
        </SimpleGrid>

        <Checkbox
          label="종일"
          checked={form.allDay}
          onChange={(e) => handleAllDayToggle(e.currentTarget.checked)}
        />

        <SimpleGrid cols={2}>
          <TextInput
            label="시작"
            type={form.allDay ? 'date' : 'datetime-local'}
            required
            withAsterisk
            value={form.datetime}
            onChange={(e) => handleChange('datetime', e.currentTarget.value)}
          />
          <TextInput
            label="종료"
            type={form.allDay ? 'date' : 'datetime-local'}
            value={form.endDatetime}
            onChange={(e) => handleChange('endDatetime', e.currentTarget.value)}
          />
        </SimpleGrid>

        <Textarea
          label="메모"
          placeholder="메모 (선택)"
          autosize
          minRows={2}
          maxRows={4}
          value={form.note}
          onChange={(e) => handleChange('note', e.currentTarget.value)}
        />

        <Group justify="space-between" mt="md">
          <Group gap="xs">
            {isEditing && onDelete && (
              <Button
                variant="subtle"
                color="red"
                onClick={() => onDelete(initialData.id)}
              >
                삭제
              </Button>
            )}
          </Group>
          <Group gap="xs">
            <Button variant="default" onClick={onCancel}>
              취소
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEditing ? '수정' : '추가'}
            </Button>
          </Group>
        </Group>
      </Stack>
    </form>
  )
}
