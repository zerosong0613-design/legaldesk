import { useMemo, useState } from 'react'
import { useCaseStore } from '../../store/caseStore'
import { useUiStore } from '../../store/uiStore'
import { readCaseDetail, writeCaseDetail } from '../../api/drive'
import { formatDateTime, formatDate } from '../../utils/dateUtils'

const ICONS = {
  hearing: { bg: 'bg-purple-100', text: 'text-purple-600', label: '기일' },
  kakao: { bg: 'bg-yellow-100', text: 'text-yellow-600', label: '카톡' },
  memo: { bg: 'bg-green-100', text: 'text-green-600', label: '메모' },
}

function groupByDate(items) {
  const groups = {}
  for (const item of items) {
    const date = formatDate(item.datetime)
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  return Object.entries(groups).sort((a, b) => (a[0] > b[0] ? -1 : 1))
}

export default function Timeline({ caseData }) {
  const { loadCaseDetail } = useCaseStore()
  const { showToast } = useUiStore()
  const [memoText, setMemoText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 모든 항목을 통합하여 시간순 정렬
  const allItems = useMemo(() => {
    const items = []

    // 기일
    for (const h of caseData.hearings || []) {
      items.push({
        type: 'hearing',
        datetime: h.datetime,
        title: `${h.type} — ${h.court || ''}${h.room ? ` ${h.room}` : ''}`,
        content: h.note || '',
        id: h.id,
      })
    }

    // 카카오톡
    for (const k of caseData.kakaoMessages || []) {
      items.push({
        type: 'kakao',
        datetime: k.datetime,
        title: k.sender,
        content: k.message,
        isFromClient: k.isFromClient,
        id: k.id,
      })
    }

    // 메모
    for (const m of caseData.memos || []) {
      items.push({
        type: 'memo',
        datetime: m.datetime,
        title: '메모',
        content: m.content,
        id: m.id,
      })
    }

    return items.sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
  }, [caseData])

  const dateGroups = useMemo(() => groupByDate(allItems), [allItems])

  const handleAddMemo = async () => {
    if (!memoText.trim()) return

    setIsSaving(true)
    try {
      const newMemo = {
        id: `m-${Date.now()}`,
        datetime: new Date().toISOString(),
        content: memoText.trim(),
        createdAt: new Date().toISOString(),
      }

      const detail = await readCaseDetail(caseData.driveFileId)
      detail.memos = [...(detail.memos || []), newMemo]
      await writeCaseDetail(caseData.driveFileId, detail)
      await loadCaseDetail(caseData.id)

      setMemoText('')
      showToast('메모가 추가되었습니다.', 'success')
    } catch (err) {
      showToast(`메모 저장 실패: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMemo = async (memoId) => {
    try {
      const detail = await readCaseDetail(caseData.driveFileId)
      detail.memos = (detail.memos || []).filter((m) => m.id !== memoId)
      await writeCaseDetail(caseData.driveFileId, detail)
      await loadCaseDetail(caseData.id)
      showToast('메모가 삭제되었습니다.', 'success')
    } catch (err) {
      showToast(`메모 삭제 실패: ${err.message}`, 'error')
    }
  }

  const renderItem = (item) => {
    const icon = ICONS[item.type]
    return (
      <div key={item.id} className="flex gap-3 py-3">
        {/* 아이콘 */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${icon.bg}`}
        >
          <span className={`text-xs font-bold ${icon.text}`}>
            {item.type === 'hearing' && '기'}
            {item.type === 'kakao' && '톡'}
            {item.type === 'memo' && '메'}
          </span>
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={`text-sm font-medium ${
                item.type === 'kakao' && item.isFromClient
                  ? 'text-blue-700'
                  : 'text-gray-800'
              }`}
            >
              {item.title}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${icon.bg} ${icon.text}`}>
              {icon.label}
            </span>
            <span className="text-xs text-gray-400">
              {formatDateTime(item.datetime)}
            </span>
          </div>
          {item.content && (
            <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">
              {item.content}
            </p>
          )}
        </div>

        {/* 메모 삭제 */}
        {item.type === 'memo' && (
          <button
            onClick={() => handleDeleteMemo(item.id)}
            className="text-gray-300 hover:text-red-500 flex-shrink-0"
            title="삭제"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 메모 입력 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={memoText}
          onChange={(e) => setMemoText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleAddMemo()
            }
          }}
          placeholder="메모를 입력하세요... (Enter로 저장)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleAddMemo}
          disabled={!memoText.trim() || isSaving}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 whitespace-nowrap"
        >
          {isSaving ? '저장...' : '추가'}
        </button>
      </div>

      {/* 타임라인 */}
      {dateGroups.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          아직 기록이 없습니다. 기일, 카카오톡, 메모를 추가해보세요.
        </p>
      ) : (
        <div className="space-y-4">
          {dateGroups.map(([date, items]) => (
            <div key={date}>
              <div className="sticky top-16 z-5 bg-gray-50 py-1">
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  {date}
                </span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 px-4">
                {items.map(renderItem)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
