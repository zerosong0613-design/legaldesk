import Badge from '../ui/Badge'

const CONSULT_BADGE = {
  접수: 'bg-yellow-100 text-yellow-800',
  진행: 'bg-blue-100 text-blue-800',
  완료: 'bg-gray-100 text-gray-600',
  보류: 'bg-red-100 text-red-800',
}

function getDday(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return null
  return diff
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function ConsultationCard({ data, onClick, onEdit, onDelete }) {
  const dday = getDday(data.deadline)
  const isUrgent = dday !== null && dday <= 7

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-5 cursor-pointer hover:shadow-md transition-shadow ${
        isUrgent ? 'border-orange-300 ring-1 ring-orange-100' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
              자문
            </span>
            <span className="text-sm text-gray-500">{data.type}</span>
            <Badge status={data.status} />
          </div>
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {data.clientName}
          </h3>
        </div>
        <div className="flex gap-1 ml-2">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(data) }}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="수정"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(data) }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="삭제"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {data.subject && (
        <p className="text-sm text-gray-600 mb-2 truncate">{data.subject}</p>
      )}

      {data.deadline && (
        <div className={`text-sm ${isUrgent ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
          마감: {formatDate(data.deadline)}
          {dday !== null && ` (D-${dday})`}
        </div>
      )}

      {data.tags?.length > 0 && (
        <div className="flex gap-1 mt-3 flex-wrap">
          {data.tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
