import { Card, Group, Text, Badge as MantineBadge, ActionIcon } from '@mantine/core'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import Badge from '../ui/Badge'

function getDday(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return null
  return diff
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function CaseCard({ caseData, onClick, onEdit, onDelete }) {
  const dday = getDday(caseData.nextHearingDate)
  const isUrgent = dday !== null && dday <= 7

  return (
    <Card
      onClick={onClick}
      padding="lg"
      style={{
        cursor: 'pointer',
        borderColor: isUrgent ? 'var(--mantine-color-red-3)' : undefined,
        boxShadow: isUrgent ? '0 0 0 1px var(--mantine-color-red-1)' : undefined,
      }}
    >
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" mb={4}>
            <Text size="sm" ff="monospace" c="dimmed">
              {caseData.caseNumber || '번호 미정'}
            </Text>
            <Badge status={caseData.status} />
          </Group>
          <Text fw={600} truncate>{caseData.clientName}</Text>
        </div>
        <Group gap={4}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onEdit(caseData) }}
          >
            <IconEdit size={14} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(caseData) }}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      </Group>

      <Text size="sm" c="dimmed" mb="xs">
        {caseData.type} {caseData.court && `| ${caseData.court}`}
      </Text>

      {caseData.nextHearingDate && (
        <Text size="sm" c={isUrgent ? 'red' : 'dimmed'} fw={isUrgent ? 600 : undefined}>
          다음 기일: {formatDate(caseData.nextHearingDate)}
          {dday !== null && ` (D-${dday})`}
        </Text>
      )}

      {caseData.tags?.length > 0 && (
        <Group gap={4} mt="sm">
          {caseData.tags.map((tag) => (
            <MantineBadge key={tag} variant="light" color="gray" size="xs">
              {tag}
            </MantineBadge>
          ))}
        </Group>
      )}
    </Card>
  )
}
