import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCaseStore } from '../store/caseStore'
import TabBar from '../components/ui/TabBar'
import Badge from '../components/ui/Badge'
import HearingList from '../components/case/HearingList'
import KakaoParser from '../components/case/KakaoParser'
import Toast from '../components/ui/Toast'

const TABS = [
  { id: 'timeline', label: '타임라인' },
  { id: 'hearings', label: '기일' },
  { id: 'kakao', label: '카카오톡' },
  { id: 'email', label: '이메일' },
  { id: 'docs', label: '문서' },
]

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentCase, loadCaseDetail, isLoading } = useCaseStore()
  const [activeTab, setActiveTab] = useState('hearings')

  useEffect(() => {
    loadCaseDetail(id)
  }, [id, loadCaseDetail])

  if (isLoading || !currentCase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {currentCase.clientName}
                </h1>
                <Badge status={currentCase.status} />
              </div>
              <p className="text-sm text-gray-500">
                {currentCase.caseNumber || '사건번호 미정'}
                {currentCase.court && ` | ${currentCase.court}`}
                {currentCase.type && ` | ${currentCase.type}`}
              </p>
            </div>
          </div>
          <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'timeline' && (
          <div className="text-center py-16 text-gray-500 text-sm">
            Step 6에서 타임라인이 구현됩니다
          </div>
        )}

        {activeTab === 'hearings' && (
          <HearingList caseData={currentCase} />
        )}

        {activeTab === 'kakao' && (
          <KakaoParser caseData={currentCase} />
        )}

        {activeTab === 'email' && (
          <div className="text-center py-16 text-gray-500 text-sm">
            Phase 2에서 Gmail 연동이 구현됩니다
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="text-center py-16 text-gray-500 text-sm">
            Phase 2에서 Drive 문서 탭이 구현됩니다
          </div>
        )}
      </main>

      <Toast />
    </div>
  )
}
