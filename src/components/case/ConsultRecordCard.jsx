import { Card, Group, Text, Badge as MantineBadge, Stack } from '@mantine/core'

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

export default function ConsultRecordCard({ consultation, onClick }) {
  const method = METHOD_MAP[consultation.method] || METHOD_MAP.other
  const status = STATUS_MAP[consultation.status] || STATUS_MAP.reviewing

  const dateStr = consultation.date || ''
  const timeStr = consultation.time ? formatTime(consultation.time) : ''
  const displayTime = timeStr ? `${dateStr}  ${timeStr}` : dateStr

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
            {method.icon} {method.label}
          </Text>
          <MantineBadge variant="light" size="sm" color={status.color}>
            {status.label}
          </MantineBadge>
        </Group>
        <Text size="xs" c="dimmed">{displayTime}</Text>
        <Text size="sm" lineClamp={2} c="dark">
          {consultation.content}
        </Text>
      </Stack>
    </Card>
  )
}
