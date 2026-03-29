import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Center, Loader, Text, Stack } from '@mantine/core'
import { useAuthStore } from './useAuth'

export default function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { handleCallback } = useAuthStore()

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      navigate('/', { replace: true })
      return
    }

    if (code) {
      handleCallback(code).then((success) => {
        navigate(success ? '/' : '/', { replace: true })
      })
    }
  }, [searchParams, handleCallback, navigate])

  return (
    <Center mih="100vh" bg="gray.0">
      <Stack align="center" gap="md">
        <Loader color="indigo" size="md" />
        <Text c="dimmed">로그인 처리 중...</Text>
      </Stack>
    </Center>
  )
}
