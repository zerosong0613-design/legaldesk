import { useState } from 'react'
import {
  Text, Group, Stack, Badge as MantineBadge, Button, Divider,
} from '@mantine/core'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import Modal from '../ui/Modal'

const METHOD_MAP = {
  visit: { label: '방문상담', icon: '🏢' },
  call: { label: '전화상담', icon: '📞' },
  video: { label: '화상상담', icon: '🎥' },
  kakao: { label: '카카오톡', icon: '💛' },
  other: { label: '기타', icon: '💬' },
}

const STATUS_MAP = {
  reviewing: { label: '검토중', color: 'yellow' },
  done: { label: '완료', color: 'green' },
  followup: { label: '후속필요', color: 'red' },
}

function formatTime(time) {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? '오후' : '오전'
  const hour = h > 12 ? h - 12 : h || 12
  return `${period} ${hour}:${String(m).padStart(2, '0')}`
}

export default function ConsultRecordDetail({
  consultation,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!consultation) return null

  const method = METHOD_MAP[consultation.method] || METHOD_MAP.other
  const status = STATUS_MAP[consultation.status] || STATUS_MAP.reviewing
  const timeStr = consultation.time ? formatTime(consultation.time) : ''
  const displayTime = timeStr ? `${consultation.date}  ${timeStr}` : consultation.date

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDelete(consultation.id)
    setConfirmDelete(false)
  }

  const handleClose = () => {
    setConfirmDelete(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="상담 상세">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <Text size="lg">{method.icon}</Text>
            <Text fw={600}>{method.label}</Text>
          </Group>
          <MantineBadge variant="light" color={status.color}>
            {status.label}
          </MantineBadge>
        </Group>

        <Text size="sm" c="dimmed">{displayTime}</Text>

        <Divider />

        <div>
          <Text size="sm" fw={500} c="dimmed" mb={4}>상담 내용</Text>
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {consultation.content}
          </Text>
        </div>

        {consultation.clientRequest && (
          <div>
            <Text size="sm" fw={500} c="dimmed" mb={4}>의뢰인 요청사항</Text>
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {consultation.clientRequest}
            </Text>
          </div>
        )}

        <Divider />

        <Group justify="flex-end" gap="sm">
          <Button
            variant="light"
            color="gray"
            leftSection={<IconEdit size={14} />}
            onClick={() => onEdit(consultation)}
          >
            수정
          </Button>
          <Button
            variant="light"
            color={confirmDelete ? 'red' : 'gray'}
            leftSection={<IconTrash size={14} />}
            onClick={handleDelete}
          >
            {confirmDelete ? '정말 삭제하시겠습니까?' : '삭제'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
