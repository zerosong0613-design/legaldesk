import { Group, Text, Box } from '@mantine/core'

const STAGES = [
  { code: 'police', label: '경찰수사' },
  { code: 'prosecution', label: '검찰' },
  { code: 'indictment', label: '기소' },
  { code: 'trial', label: '재판' },
  { code: 'verdict', label: '판결' },
]

export default function CriminalStageBar({ currentStage }) {
  const currentIndex = STAGES.findIndex((s) => s.code === currentStage)

  return (
    <Group gap={0} wrap="nowrap" style={{ overflow: 'hidden' }}>
      {STAGES.map((stage, i) => {
        const isCurrent = i === currentIndex
        const isPast = i < currentIndex
        const isFuture = i > currentIndex

        return (
          <Group key={stage.code} gap={0} wrap="nowrap" style={{ flex: 1 }}>
            <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <Box
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: isCurrent
                    ? 'var(--mantine-color-indigo-6)'
                    : isPast
                      ? 'var(--mantine-color-indigo-3)'
                      : 'transparent',
                  border: isFuture
                    ? '2px solid var(--mantine-color-gray-3)'
                    : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {(isCurrent || isPast) && (
                  <Box
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: 'white',
                    }}
                  />
                )}
              </Box>
              <Text
                size="xs"
                fw={isCurrent ? 700 : 400}
                c={isFuture ? 'dimmed' : isCurrent ? 'indigo' : undefined}
                mt={4}
                ta="center"
              >
                {stage.label}
              </Text>
            </Box>
            {i < STAGES.length - 1 && (
              <Box
                style={{
                  height: 2,
                  flex: 1,
                  minWidth: 12,
                  backgroundColor: i < currentIndex
                    ? 'var(--mantine-color-indigo-3)'
                    : 'var(--mantine-color-gray-2)',
                  marginTop: -16,
                }}
              />
            )}
          </Group>
        )
      })}
    </Group>
  )
}
