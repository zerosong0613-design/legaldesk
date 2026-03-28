import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../auth/useAuth'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import CaseCard from '../components/case/CaseCard'
import CaseForm from '../components/case/CaseForm'
import Modal from '../components/ui/Modal'
import Toast from '../components/ui/Toast'

const STATUS_FILTERS = [
  { label: '전체', value: null },
  { label: '접수', value: '접수' },
  { label: '진행', value: '진행' },
  { label: '종결', value: '종결' },
  { label: '보류', value: '보류' },
]

function getDday(dateStr) {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { cases, createCase, updateCase, deleteCase, error: caseError } = useCaseStore()
  const {
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    isModalOpen, modalType, modalData,
    openModal, closeModal, showToast,
  } = useUiStore()

  // D-7 이내 기일 사건
  const urgentCases = useMemo(
    () => cases.filter((c) => {
      const d = getDday(c.nextHearingDate)
      return d !== null && d >= 0 && d <= 7 && c.status !== '종결'
    }),
    [cases]
  )

  // 필터 + 검색 적용
  const filteredCases = useMemo(() => {
    let result = cases

    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.clientName?.toLowerCase().includes(q) ||
          c.caseNumber?.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }

    // 최근 활동순 정렬
    return result.sort(
      (a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0)
    )
  }, [cases, statusFilter, searchQuery])

  const handleCreate = async (data) => {
    const result = await createCase(data)
    if (result) {
      closeModal()
      showToast('사건이 생성되었습니다.', 'success')
    }
  }

  const handleEdit = async (data) => {
    await updateCase(modalData.id, data)
    closeModal()
    showToast('사건이 수정되었습니다.', 'success')
  }

  const handleDelete = async () => {
    await deleteCase(modalData.id)
    closeModal()
    showToast('사건이 삭제되었습니다.', 'success')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">LegalDesk</h1>
          <div className="flex items-center gap-3">
            {user?.picture && (
              <img
                src={user.picture}
                alt=""
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            )}
            <span className="text-sm text-gray-700 hidden sm:block">{user?.name}</span>
            <button
              onClick={logout}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* D-7 알림 배너 */}
        {urgentCases.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-red-800 mb-2">
              7일 이내 기일이 있는 사건 ({urgentCases.length}건)
            </h3>
            <div className="space-y-1">
              {urgentCases.map((c) => (
                <p key={c.id} className="text-sm text-red-700">
                  [{c.caseNumber || '번호 미정'}] {c.clientName} — D-
                  {getDday(c.nextHearingDate)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* 검색 + 필터 + 새 사건 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="의뢰인명, 사건번호, 태그 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => openModal('createCase')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            + 새 사건
          </button>
        </div>

        {/* 상태 필터 탭 */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
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
              {f.value === null && ` (${cases.length})`}
              {f.value && ` (${cases.filter((c) => c.status === f.value).length})`}
            </button>
          ))}
        </div>

        {/* 에러 표시 */}
        {caseError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            {caseError}
          </div>
        )}

        {/* 사건 카드 목록 */}
        {filteredCases.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2">
              {cases.length === 0
                ? '아직 등록된 사건이 없습니다'
                : '검색 결과가 없습니다'}
            </p>
            {cases.length === 0 && (
              <button
                onClick={() => openModal('createCase')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                첫 번째 사건 등록하기
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCases.map((c) => (
              <CaseCard
                key={c.id}
                caseData={c}
                onClick={() => navigate(`/case/${c.id}`)}
                onEdit={(data) => openModal('editCase', data)}
                onDelete={(data) => openModal('deleteConfirm', data)}
              />
            ))}
          </div>
        )}
      </main>

      {/* 사건 생성 모달 */}
      <Modal
        isOpen={isModalOpen && modalType === 'createCase'}
        onClose={closeModal}
        title="새 사건 등록"
      >
        <CaseForm onSubmit={handleCreate} onCancel={closeModal} />
      </Modal>

      {/* 사건 수정 모달 */}
      <Modal
        isOpen={isModalOpen && modalType === 'editCase'}
        onClose={closeModal}
        title="사건 수정"
      >
        <CaseForm
          initialData={modalData}
          onSubmit={handleEdit}
          onCancel={closeModal}
        />
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={isModalOpen && modalType === 'deleteConfirm'}
        onClose={closeModal}
        title="사건 삭제"
      >
        <p className="text-sm text-gray-600 mb-6">
          <strong>{modalData?.clientName}</strong> ({modalData?.caseNumber || '번호 미정'})
          사건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={closeModal}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg"
          >
            삭제
          </button>
        </div>
      </Modal>

      <Toast />
    </div>
  )
}
