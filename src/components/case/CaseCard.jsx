import Badge from '../ui/Badge'

function getDday(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil(
    (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
  )
  if (diff < 0) return null
  return diff
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function CaseCard({ caseData, onClick, onEdit, onDelete }) {
  const dday = getDday(caseData.nextHearingDate)
  const isUrgent = dday !== null && dday <= 7

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-5 cursor-pointer hover:shadow-md transition-shadow ${
        isUrgent ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-gray-500">
              {caseData.caseNumber || '번호 미정'}
            </span>
            <Badge status={caseData.status} />
          </div>
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {caseData.clientName}
          </h3>
        </div>
        <div className="flex gap-1 ml-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(caseData)
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="수정"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(caseData)
            }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="삭제"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-2">
        {caseData.type} {caseData.court && `| ${caseData.court}`}
      </div>

      {caseData.nextHearingDate && (
        <div
          className={`text-sm ${isUrgent ? 'text-red-600 font-medium' : 'text-gray-500'}`}
        >
          다음 기일: {formatDate(caseData.nextHearingDate)}
          {dday !== null && ` (D-${dday})`}
        </div>
      )}

      {caseData.tags?.length > 0 && (
        <div className="flex gap-1 mt-3 flex-wrap">
          {caseData.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
