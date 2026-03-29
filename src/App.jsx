import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Center, Loader, Text, Stack, Button, Alert } from '@mantine/core'
import { useAuthStore } from './auth/useAuth'
import { useCaseStore } from './store/caseStore'
import GoogleAuth from './auth/GoogleAuth'
import AuthCallback from './auth/AuthCallback'
import Dashboard from './pages/Dashboard'
import CaseDetail from './pages/CaseDetail'
import ConsultationDetail from './pages/ConsultationDetail'
import Billing from './pages/Billing'

function AppContent() {
  const { user, isLoading: authLoading, initialize } = useAuthStore()
  const { isInitialized, initDrive, isLoading: driveLoading, error } = useCaseStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (user && !isInitialized) {
      initDrive()
    }
  }, [user, isInitialized, initDrive])

  if (authLoading) {
    return (
      <Center mih="100vh" bg="gray.0">
        <Loader color="indigo" size="md" />
      </Center>
    )
  }

  if (!user) {
    return <GoogleAuth />
  }

  if (!isInitialized && driveLoading) {
    return (
      <Center mih="100vh" bg="gray.0">
        <Stack align="center" gap="md">
          <Loader color="indigo" size="md" />
          <Text c="dimmed">Drive 연결 중...</Text>
        </Stack>
      </Center>
    )
  }

  if (error && !isInitialized) {
    return (
      <Center mih="100vh" bg="gray.0">
        <Stack align="center" gap="md" maw={360} mx="md">
          <Alert color="red" w="100%">{error}</Alert>
          <Button onClick={initDrive}>다시 시도</Button>
        </Stack>
      </Center>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/case/:id" element={<CaseDetail />} />
      <Route path="/consultation/:id" element={<ConsultationDetail />} />
      <Route path="/billing" element={<Billing />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
