import { Card, Group, Text, Badge as MantineBadge, ActionIcon } from '@mantine/core'
import { IconEdit, IconTrash, IconStar, IconStarFilled } from '@tabler/icons-react'
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

export default function ConsultationCard({ data, onClick, onEdit, onDelete, isFavorite, onToggleFavorite }) {
  const dday = getDday(data.deadline)
  const isUrgent = dday !== null && dday <= 7

  return (
    <Card
      onClick={onClick}
      padding="lg"
      style={{
        cursor: 'pointer',
        borderColor: isUrgent ? 'var(--mantine-color-orange-3)' : undefined,
        boxShadow: isUrgent ? '0 0 0 1px var(--mantine-color-orange-1)' : undefined,
      }}
    >
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" mb={4}>
            <MantineBadge variant="light" color="grape" size="xs">{'\uC790\uBB38'}</MantineBadge>
            <Text size="sm" c="dimmed">{data.type}</Text>
            <Badge status={data.status} />
          </Group>
          <Text fw={600} truncate>{data.clientName}</Text>
        </div>
        <Group gap={4}>
          {onToggleFavorite && (
            <ActionIcon
              variant="subtle"
              color={isFavorite ? 'yellow' : 'gray'}
              size="sm"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
            >
              {isFavorite ? <IconStarFilled size={14} /> : <IconStar size={14} />}
            </ActionIcon>
          )}
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onEdit(data) }}
          >
            <IconEdit size={14} />
          </ActionIcon>
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onDelete(data) }}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      </Group>

      {data.subject && (
        <Text size="sm" c="dimmed" mb="xs" truncate>{data.subject}</Text>
      )}

      {data.deadline && (
        <Text size="sm" c={isUrgent ? 'orange' : 'dimmed'} fw={isUrgent ? 600 : undefined}>
          {'\uB9C8\uAC10'}: {formatDate(data.deadline)}
          {dday !== null && ` (D-${dday})`}
        </Text>
      )}

      {data.tags?.length > 0 && (
        <Group gap={4} mt="sm">
          {data.tags.map((tag) => (
            <MantineBadge key={tag} variant="light" color="gray" size="xs">
              {tag}
            </MantineBadge>
          ))}
        </Group>
      )}
    </Card>
  )
}
