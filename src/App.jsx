import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from './auth/useAuth'
import { useCaseStore } from './store/caseStore'
import GoogleAuth from './auth/GoogleAuth'
import AuthCallback from './auth/AuthCallback'
import Dashboard from './pages/Dashboard'
import CaseDetail from './pages/CaseDetail'

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <GoogleAuth />
  }

  if (!isInitialized && driveLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Drive 연결 중...</p>
        </div>
      </div>
    )
  }

  if (error && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm mx-4">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={initDrive}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/case/:id" element={<CaseDetail />} />
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
