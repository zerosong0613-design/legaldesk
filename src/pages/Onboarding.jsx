import { useState } from 'react'
import {
  Center, Paper, Title, Text, TextInput, Button,
  Stack, Group, ThemeIcon, Divider, Alert,
} from '@mantine/core'
import { IconScale, IconCheck, IconAlertCircle } from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useAuthStore } from '../auth/useAuth'

export default function Onboarding() {
  const { saveProfile } = useCaseStore()
  const user = useAuthStore((s) => s.user)

  const [form, setForm] = useState({
    lawyerName: user?.name || '',
    officeName: '',
    phone: '',
    barNumber: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const h = (name, value) => setForm({ ...form, [name]: value })

  const canSubmit = form.lawyerName.trim() && form.officeName.trim() && form.phone.trim()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    setIsSaving(true)
    setError(null)
    try {
      await saveProfile({
        lawyerName: form.lawyerName.trim(),
        officeName: form.officeName.trim(),
        phone: form.phone.trim(),
        barNumber: form.barNumber.trim(),
      })
    } catch (err) {
      setError(`저장 실패: ${err.message}`)
      setIsSaving(false)
    }
  }

  return (
    <Center mih="100vh" bg="gray.0">
      <Paper shadow="lg" radius="xl" p="xl" w={440} mx="md">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Stack align="center" gap={4}>
              <ThemeIcon size={48} radius="xl" variant="light" color="indigo">
                <IconScale size={24} />
              </ThemeIcon>
              <Title order={2} ff="'Noto Serif KR', serif">LegalDesk</Title>
              <Text size="sm" c="dimmed">시작하기 전에 기본 정보를 입력해주세요</Text>
            </Stack>

            <Divider />

            {user?.email && (
              <Alert variant="light" color="blue" radius="md">
                <Text size="xs">{user.email} 계정으로 로그인되었습니다</Text>
              </Alert>
            )}

            <TextInput
              label="변호사명"
              required
              withAsterisk
              placeholder="홍길동"
              value={form.lawyerName}
              onChange={(e) => h('lawyerName', e.currentTarget.value)}
            />

            <TextInput
              label="사무소명"
              required
              withAsterisk
              placeholder="홍길동 법률사무소"
              value={form.officeName}
              onChange={(e) => h('officeName', e.currentTarget.value)}
            />

            <TextInput
              label="연락처"
              required
              withAsterisk
              placeholder="02-1234-5678"
              value={form.phone}
              onChange={(e) => h('phone', e.currentTarget.value)}
            />

            <TextInput
              label="변호사 등록번호 (선택)"
              placeholder="12345"
              value={form.barNumber}
              onChange={(e) => h('barNumber', e.currentTarget.value)}
            />

            {error && (
              <Alert color="red" radius="md" icon={<IconAlertCircle size={16} />}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              size="md"
              fullWidth
              loading={isSaving}
              disabled={!canSubmit}
              leftSection={<IconCheck size={18} />}
            >
              시작하기
            </Button>

            <Text size="xs" c="dimmed" ta="center">
              모든 데이터는 본인 Google Drive에만 저장됩니다
            </Text>
          </Stack>
        </form>
      </Paper>
    </Center>
  )
}
