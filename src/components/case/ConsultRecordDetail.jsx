import { useState } from 'react'
import {
  Text, Group, Stack, Badge as MantineBadge, Button, Divider,
} from '@mantine/core'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import Modal from '../ui/Modal'

const ACTIVITY_TYPE_MAP = {
  consult: { label: '상담', icon: '💬' },
  police_attend: { label: '경찰입회', icon: '🚔' },
  prosecution_attend: { label: '검찰입회', icon: '⚖️' },
  visit: { label: '접견', icon: '🏛️' },
  negotiation: { label: '상대방 협의', icon: '🤝' },
  other_activity: { label: '기타활동', icon: '📋' },
}

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

function DetailField({ label, value }) {
  if (!value) return null
  return (
    <div>
      <Text size="sm" fw={500} c="dimmed" mb={4}>{label}</Text>
      <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{value}</Text>
    </div>
  )
}

function ConsultDetail({ c }) {
  const method = METHOD_MAP[c.method] || METHOD_MAP.other
  return (
    <>
      <Group gap="xs">
        <Text size="lg">{method.icon}</Text>
        <Text fw={600}>{method.label}</Text>
      </Group>
      <Divider />
      <DetailField label="상담 내용" value={c.content} />
      <DetailField label="의뢰인 요청사항" value={c.clientRequest} />
    </>
  )
}

function AttendDetail({ c }) {
  const isPolice = c.activityType === 'police_attend'
  const activity = ACTIVITY_TYPE_MAP[c.activityType]
  return (
    <>
      <Group gap="xs">
        <Text size="lg">{activity.icon}</Text>
        <Text fw={600}>{activity.label}</Text>
      </Group>
      <Divider />
      <DetailField label={isPolice ? '경찰서' : '검찰청'} value={c.location} />
      <DetailField label={isPolice ? '수사관' : '검사'} value={c.investigatorName} />
      <DetailField label="피의자 진술 요지" value={c.suspectStatement} />
      <DetailField label="수사관 질문 요약" value={c.investigatorQuestions} />
      {c.evidenceSubmitted && (
        <div>
          <Text size="sm" fw={500} c="dimmed" mb={4}>증거 제출</Text>
          <MantineBadge variant="light" color="blue" size="sm" mb={4}>제출함</MantineBadge>
          {c.evidenceDetail && (
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{c.evidenceDetail}</Text>
          )}
        </div>
      )}
      <DetailField label="다음 일정" value={c.nextSchedule} />
      <DetailField label="조치사항 / 특이사항" value={c.actionItems} />
    </>
  )
}

function VisitDetail({ c }) {
  return (
    <>
      <Group gap="xs">
        <Text size="lg">🏛️</Text>
        <Text fw={600}>접견</Text>
      </Group>
      <Divider />
      <DetailField label="장소" value={c.location} />
      <DetailField label="의뢰인 상태" value={c.clientCondition} />
      <DetailField label="접견 내용" value={c.content} />
      <DetailField label="의뢰인 요청사항" value={c.clientRequest} />
    </>
  )
}

function OtherActivityDetail({ c }) {
  return (
    <>
      <Group gap="xs">
        <Text size="lg">📋</Text>
        <Text fw={600}>기타활동</Text>
      </Group>
      <Divider />
      <DetailField label="장소" value={c.location} />
      <DetailField label="활동 내용" value={c.content} />
      <DetailField label="조치사항" value={c.actionItems} />
    </>
  )
}

function NegotiationDetail({ c }) {
  return (
    <>
      <Group gap="xs">
        <Text size="lg">🤝</Text>
        <Text fw={600}>상대방 협의</Text>
      </Group>
      <Divider />
      <DetailField label="상대방 / 상대 대리인" value={c.investigatorName} />
      <DetailField label="장소" value={c.location} />
      <DetailField label="협의 내용" value={c.content} />
      <DetailField label="조치사항 / 후속 계획" value={c.actionItems} />
    </>
  )
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

  const type = consultation.activityType || 'consult'
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

  const titleMap = {
    consult: '상담 상세',
    police_attend: '경찰입회 상세',
    prosecution_attend: '검찰입회 상세',
    visit: '접견 상세',
    negotiation: '상대방 협의 상세',
    other_activity: '활동 상세',
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={titleMap[type] || '활동 상세'}>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">{displayTime}</Text>
          <MantineBadge variant="light" color={status.color}>
            {status.label}
          </MantineBadge>
        </Group>

        {type === 'consult' && <ConsultDetail c={consultation} />}
        {(type === 'police_attend' || type === 'prosecution_attend') && <AttendDetail c={consultation} />}
        {type === 'visit' && <VisitDetail c={consultation} />}
        {type === 'negotiation' && <NegotiationDetail c={consultation} />}
        {type === 'other_activity' && <OtherActivityDetail c={consultation} />}

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
