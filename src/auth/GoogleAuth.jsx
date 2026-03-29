import { Center, Paper, Title, Text, Button, Alert, Stack } from '@mantine/core'
import { IconBrandGoogle } from '@tabler/icons-react'
import { useAuthStore } from './useAuth'

export default function GoogleAuth() {
  const { startLogin, error } = useAuthStore()

  return (
    <Center mih="100vh" bg="gray.0">
      <Paper shadow="lg" radius="xl" p="xl" w={380} mx="md">
        <Stack align="center" gap="xs">
          <Title order={2} ff="'Noto Serif KR', serif">LegalDesk</Title>
          <Text size="sm" c="dimmed" mb="lg">
            1인 변호사 사무실 사건 관리
          </Text>

          <Button
            variant="default"
            size="md"
            fullWidth
            leftSection={
              <svg width={18} height={18} viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            }
            onClick={startLogin}
          >
            Google 계정으로 로그인
          </Button>

          {error && (
            <Alert color="red" radius="md" w="100%" mt="sm">
              {error}
            </Alert>
          )}

          <Text size="xs" c="dimmed" mt="md">
            데이터는 본인 Google Drive에만 저장됩니다
          </Text>
        </Stack>
      </Paper>
    </Center>
  )
}
