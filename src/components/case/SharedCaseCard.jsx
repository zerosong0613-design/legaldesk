import { Card, Group, Text, Badge as MantineBadge, Stack, Box } from '@mantine/core'
import { IconUser } from '@tabler/icons-react'
import Badge from '../ui/Badge'

const ROLE_MAP = {
  reader: { label: '읽기', color: 'gray' },
  writer: { label: '편집', color: 'teal' },
  owner: { label: '소유자', color: 'orange' },
}

const CATEGORY_MAP = {
  case: '민사',
  criminal: '형사',
  consultation: '자문',
}

export default function SharedCaseCard({ caseData, onClick }) {
  const role = ROLE_MAP[caseData.myRole] || ROLE_MAP.reader
  const categoryLabel = CATEGORY_MAP[caseData.category] || ''

  return (
    <Card
      padding="md"
      withBorder
      style={{ cursor: 'pointer' }}
      onClick={() => onClick?.(caseData)}
    >
      <Stack gap={4}>
        <Group justify="space-between">
          <Group gap="xs">
            {categoryLabel && (
              <MantineBadge variant="light" size="xs" color="grape">{categoryLabel}</MantineBadge>
            )}
            <Text size="sm" fw={700} truncate>
              {caseData.clientName || caseData.caseName || '(이름 없음)'}
            </Text>
            <Badge status={caseData.status} />
          </Group>
          <MantineBadge variant="light" size="xs" color={role.color}>
            {role.label}
          </MantineBadge>
        </Group>

        <Text size="xs" c="dimmed" ff="monospace">
          {caseData.caseNumber || ''}
          {caseData.court && ` | ${caseData.court}`}
          {caseData.type && ` | ${caseData.type}`}
        </Text>

        <Group gap={4} mt={2}>
          <Box
            style={{
              width: 16, height: 16, borderRadius: '50%',
              background: 'var(--mantine-color-blue-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconUser size={10} color="var(--mantine-color-blue-6)" />
          </Box>
          <Text size="xs" c="dimmed">
            {caseData.ownerName || caseData.ownerEmail || '소유자 정보 없음'}
          </Text>
        </Group>
      </Stack>
    </Card>
  )
}
