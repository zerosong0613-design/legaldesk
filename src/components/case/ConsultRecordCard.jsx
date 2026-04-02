import { Card, Group, Text, Badge as MantineBadge, Stack } from '@mantine/core'

const ACTIVITY_TYPE_MAP = {
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

function getActivityDisplay(consultation) {
  const type = consultation.activityType || 'consult'
  if (type === 'consult') {
    const method = METHOD_MAP[consultation.method] || METHOD_MAP.other
    return { icon: method.icon, label: method.label }
  }
  const activity = ACTIVITY_TYPE_MAP[type] || ACTIVITY_TYPE_MAP.other_activity
  return { icon: activity.icon, label: activity.label }
}

function getPreviewText(consultation) {
  const type = consultation.activityType || 'consult'
  if (type === 'police_attend' || type === 'prosecution_attend') {
    return consultation.location
      ? `${consultation.location}${consultation.investigatorName ? ` — ${consultation.investigatorName}` : ''}`
      : consultation.actionItems || ''
  }
  if (type === 'visit') {
    return consultation.location
      ? `${consultation.location}${consultation.clientCondition ? ` — ${consultation.clientCondition}` : ''}`
      : consultation.content || ''
  }
  if (type === 'negotiation') {
    return consultation.investigatorName
      ? `${consultation.investigatorName}${consultation.location ? ` — ${consultation.location}` : ''}`
      : consultation.content || ''
  }
  return consultation.content || ''
}

export default function ConsultRecordCard({ consultation, onClick }) {
  const { icon, label } = getActivityDisplay(consultation)
  const status = STATUS_MAP[consultation.status] || STATUS_MAP.reviewing

  const dateStr = consultation.date || ''
  const timeStr = consultation.time ? formatTime(consultation.time) : ''
  const displayTime = timeStr ? `${dateStr}  ${timeStr}` : dateStr
  const preview = getPreviewText(consultation)

  return (
    <Card
      padding="md"
      withBorder
      style={{ cursor: 'pointer' }}
      onClick={() => onClick?.(consultation)}
    >
      <Stack gap={4}>
        <Group justify="space-between">
          <Text size="sm" fw={600}>
            {icon} {label}
          </Text>
          <MantineBadge variant="light" size="sm" color={status.color}>
            {status.label}
          </MantineBadge>
        </Group>
        <Text size="xs" c="dimmed">{displayTime}</Text>
        <Text size="sm" lineClamp={2} c="dark">
          {preview}
        </Text>
      </Stack>
    </Card>
  )
}
