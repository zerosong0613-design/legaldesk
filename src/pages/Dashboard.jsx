import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../auth/useAuth'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import CaseCard from '../components/case/CaseCard'
import ConsultationCard from '../components/case/ConsultationCard'
import CaseForm from '../components/case/CaseForm'
import ConsultationForm from '../components/case/ConsultationForm'
import Modal from '../components/ui/Modal'
import MiniCalendar from '../components/ui/MiniCalendar'
import Toast from '../components/ui/Toast'

function getDday(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (d.getHours() === 0 && d.getMinutes() === 0) return null
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const CASE_STATUS_FILTERS = [
  { label: '전체', value: null },
  { label: '접수', value: '접수' },
  { label: '진행', value: '진행' },
  { label: '종결', value: '종결' },
  { label: '보류', value: '보류' },
]

const CONSULT_STATUS_FILTERS = [
  { label: '전체', value: null },
  { label: '접수', value: '접수' },
  { label: '진행', value: '진행' },
  { label: '완료', value: '완료' },
  { label: '보류', value: '보류' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const {
    cases, consultations,
    createCase, updateCase, deleteCase,
    createConsultation, updateConsultation, deleteConsultation,
    error: storeError,
  } = useCaseStore()
  const {
    dashboardTab, setDashboardTab,
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    isModalOpen, modalType, modalData,
    openModal, closeModal, showToast,
  } = useUiStore()

  // ─── 통계 ───
  const stats = useMemo(() => {
    const activeCases = cases.filter((c) => c.status === '진행' || c.status === '접수')
    const activeConsults = consultations.filter((c) => c.status === '진행' || c.status === '접수')

    const thisWeekHearings = cases.filter((c) => {
      const d = getDday(c.nextHearingDate)
      return d !== null && d >= 0 && d <= 7 && c.status !== '종결'
    })

    const urgentDeadlines = consultations.filter((c) => {
      const d = getDday(c.deadline)
      return d !== null && d >= 0 && d <= 7 && c.status !== '완료'
    })

    return {
      activeCases: activeCases.length,
      activeConsults: activeConsults.length,
      thisWeekHearings: thisWeekHearings.length,
      urgentDeadlines: urgentDeadlines.length,
    }
  }, [cases, consultations])

  // ─── 캘린더 이벤트 (전체 기일 + 마감일) ───
  const calendarEvents = useMemo(() => {
    const events = []

    cases.forEach((c) => {
      if (c.nextHearingDate && c.status !== '종결') {
        events.push({
          type: 'hearing',
          label: `[${c.caseNumber || '번호 미정'}] ${c.clientName}`,
          date: c.nextHearingDate,
          time: formatTime(c.nextHearingDate),
          caseId: c.id,
          dday: getDday(c.nextHearingDate),
        })
      }
    })

    consultations.forEach((c) => {
      if (c.deadline && c.status !== '완료') {
        events.push({
          type: 'deadline',
          label: `[자문] ${c.clientName} — ${c.subject || c.type}`,
          date: c.deadline,
          time: null,
          caseId: c.id,
          dday: getDday(c.deadline),
        })
      }
    })

    return events
  }, [cases, consultations])

  // ─── 다가오는 일정 (14일 이내) ───
  const upcomingEvents = useMemo(() => {
    return calendarEvents
      .filter((ev) => ev.dday !== null && ev.dday >= 0 && ev.dday <= 14)
      .sort((a, b) => a.dday - b.dday)
  }, [calendarEvents])

  // ─── 필터 + 검색 ───
  const statusFilters = dashboardTab === 'cases' ? CASE_STATUS_FILTERS : CONSULT_STATUS_FILTERS
  const items = dashboardTab === 'cases' ? cases : consultations

  const filteredItems = useMemo(() => {
    let result = items

    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) =>
        c.clientName?.toLowerCase().includes(q) ||
        c.caseNumber?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }

    return result.sort(
      (a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0)
    )
  }, [items, statusFilter, searchQuery])

  // ─── 핸들러 ───
  const handleCreateCase = async (data) => {
    const result = await createCase(data)
    if (result) { closeModal(); showToast('사건이 생성되었습니다.', 'success') }
  }

  const handleEditCase = async (data) => {
    await updateCase(modalData.id, data)
    closeModal(); showToast('사건이 수정되었습니다.', 'success')
  }

  const handleCreateConsultation = async (data) => {
    const result = await createConsultation(data)
    if (result) { closeModal(); showToast('자문이 생성되었습니다.', 'success') }
  }

  const handleEditConsultation = async (data) => {
    await updateConsultation(modalData.id, data)
    closeModal(); showToast('자문이 수정되었습니다.', 'success')
  }

  const handleDelete = async () => {
    if (modalData.category === 'consultation') {
      await deleteConsultation(modalData.id)
      showToast('자문이 삭제되었습니다.', 'success')
    } else {
      await deleteCase(modalData.id)
      showToast('사건이 삭제되었습니다.', 'success')
    }
    closeModal()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 onClick={() => navigate('/')} className="text-lg font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors">LegalDesk</h1>
          <div className="flex items-center gap-3">
            {user?.picture && (
              <img src={user.picture} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            )}
            <span className="text-sm text-gray-700 hidden sm:block">{user?.name}</span>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded border border-gray-300 hover:bg-gray-50">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">진행중 사건</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeCases}<span className="text-sm font-normal text-gray-500">건</span></p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">이번주 기일</p>
            <p className={`text-2xl font-bold ${stats.thisWeekHearings > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {stats.thisWeekHearings}<span className="text-sm font-normal text-gray-500">건</span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">마감 임박 자문</p>
            <p className={`text-2xl font-bold ${stats.urgentDeadlines > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
              {stats.urgentDeadlines}<span className="text-sm font-normal text-gray-500">건</span>
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">진행중 자문</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeConsults}<span className="text-sm font-normal text-gray-500">건</span></p>
          </div>
        </div>

        {/* 캘린더 + 다가오는 일정 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <MiniCalendar
              events={calendarEvents}
              onEventClick={(ev) => ev.caseId && navigate(`/case/${ev.caseId}`)}
            />
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-4 h-full">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                다가오는 일정
              </h3>
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-gray-400 py-4">14일 이내 예정된 일정이 없습니다</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {upcomingEvents.map((ev, i) => (
                    <div
                      key={i}
                      onClick={() => ev.caseId && navigate(`/case/${ev.caseId}`)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold min-w-[3rem] text-center ${
                        ev.dday === 0
                          ? 'bg-red-600 text-white'
                          : ev.dday <= 3
                            ? 'bg-red-100 text-red-700'
                            : ev.type === 'hearing'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-orange-100 text-orange-700'
                      }`}>
                        {ev.dday === 0 ? 'D-Day' : `D-${ev.dday}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{ev.label}</p>
                        <p className="text-xs text-gray-400">
                          {formatDate(ev.date)}{ev.time ? ` ${ev.time}` : ''}
                          {' · '}{ev.type === 'hearing' ? '기일' : '마감'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 사건/자문 탭 + 검색 + 새로 만들기 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex bg-gray-200 rounded-lg p-1">
            <button
              onClick={() => setDashboardTab('cases')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dashboardTab === 'cases' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              사건 ({cases.length})
            </button>
            <button
              onClick={() => setDashboardTab('consultations')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dashboardTab === 'consultations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              자문 ({consultations.length})
            </button>
          </div>

          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dashboardTab === 'cases' ? '의뢰인명, 사건번호, 태그...' : '의뢰인명, 주제, 태그...'}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => openModal(dashboardTab === 'cases' ? 'createCase' : 'createConsultation')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            {dashboardTab === 'cases' ? '+ 새 사건' : '+ 새 자문'}
          </button>
        </div>

        {/* 상태 필터 */}
        <div className="flex gap-1 overflow-x-auto">
          {statusFilters.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap ${
                statusFilter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {f.label}
              {f.value === null && ` (${items.length})`}
              {f.value && ` (${items.filter((c) => c.status === f.value).length})`}
            </button>
          ))}
        </div>

        {/* 에러 */}
        {storeError && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{storeError}</div>
        )}

        {/* 카드 목록 */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2">
              {items.length === 0
                ? dashboardTab === 'cases' ? '아직 등록된 사건이 없습니다' : '아직 등록된 자문이 없습니다'
                : '검색 결과가 없습니다'}
            </p>
            {items.length === 0 && (
              <button
                onClick={() => openModal(dashboardTab === 'cases' ? 'createCase' : 'createConsultation')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {dashboardTab === 'cases' ? '첫 번째 사건 등록하기' : '첫 번째 자문 등록하기'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardTab === 'cases'
              ? filteredItems.map((c) => (
                  <CaseCard
                    key={c.id}
                    caseData={c}
                    onClick={() => navigate(`/case/${c.id}`)}
                    onEdit={(data) => openModal('editCase', data)}
                    onDelete={(data) => openModal('deleteConfirm', { ...data, category: 'case' })}
                  />
                ))
              : filteredItems.map((c) => (
                  <ConsultationCard
                    key={c.id}
                    data={c}
                    onClick={() => navigate(`/case/${c.id}`)}
                    onEdit={(data) => openModal('editConsultation', data)}
                    onDelete={(data) => openModal('deleteConfirm', { ...data, category: 'consultation' })}
                  />
                ))}
          </div>
        )}
      </main>

      {/* 모달들 */}
      <Modal isOpen={isModalOpen && modalType === 'createCase'} onClose={closeModal} title="새 사건 등록">
        <CaseForm onSubmit={handleCreateCase} onCancel={closeModal} />
      </Modal>

      <Modal isOpen={isModalOpen && modalType === 'editCase'} onClose={closeModal} title="사건 수정">
        <CaseForm initialData={modalData} onSubmit={handleEditCase} onCancel={closeModal} />
      </Modal>

      <Modal isOpen={isModalOpen && modalType === 'createConsultation'} onClose={closeModal} title="새 자문 등록">
        <ConsultationForm onSubmit={handleCreateConsultation} onCancel={closeModal} />
      </Modal>

      <Modal isOpen={isModalOpen && modalType === 'editConsultation'} onClose={closeModal} title="자문 수정">
        <ConsultationForm initialData={modalData} onSubmit={handleEditConsultation} onCancel={closeModal} />
      </Modal>

      <Modal isOpen={isModalOpen && modalType === 'deleteConfirm'} onClose={closeModal} title="삭제 확인">
        <p className="text-sm text-gray-600 mb-6">
          <strong>{modalData?.clientName}</strong>
          {modalData?.caseNumber && ` (${modalData.caseNumber})`}
          {modalData?.subject && ` — ${modalData.subject}`}
          을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">취소</button>
          <button onClick={handleDelete} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg">삭제</button>
        </div>
      </Modal>

      <Toast />
    </div>
  )
}
