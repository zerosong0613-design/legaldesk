import { useState } from 'react'

const CASE_TYPES = ['민사', '형사', '가사', '행정', '기타']
const CASE_STATUSES = ['접수', '진행', '종결', '보류']

export default function CaseForm({ initialData, onSubmit, onCancel }) {
  const isEditing = !!initialData

  const [form, setForm] = useState({
    caseNumber: initialData?.caseNumber || '',
    clientName: initialData?.clientName || '',
    clientEmail: initialData?.clientEmail || '',
    clientPhone: initialData?.clientPhone || '',
    type: initialData?.type || '민사',
    status: initialData?.status || '접수',
    court: initialData?.court || '',
    tags: initialData?.tags?.join(', ') || '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.clientName.trim()) return

    setIsSubmitting(true)
    try {
      const data = {
        ...form,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      }

      if (!isEditing) {
        const year = new Date().getFullYear()
        data.id = `${year}-${String(Date.now()).slice(-4)}`
        data.openedAt = new Date().toISOString().split('T')[0]
        data.closedAt = null
        data.nextHearingDate = null
      }

      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          의뢰인명 <span className="text-red-500">*</span>
        </label>
        <input
          name="clientName"
          value={form.clientName}
          onChange={handleChange}
          className={inputClass}
          placeholder="홍길동"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            사건번호
          </label>
          <input
            name="caseNumber"
            value={form.caseNumber}
            onChange={handleChange}
            className={inputClass}
            placeholder="2026가합12345"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            사건 유형
          </label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className={inputClass}
          >
            {CASE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          법원
        </label>
        <input
          name="court"
          value={form.court}
          onChange={handleChange}
          className={inputClass}
          placeholder="서울중앙지방법원"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            이메일
          </label>
          <input
            name="clientEmail"
            type="email"
            value={form.clientEmail}
            onChange={handleChange}
            className={inputClass}
            placeholder="client@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            전화번호
          </label>
          <input
            name="clientPhone"
            value={form.clientPhone}
            onChange={handleChange}
            className={inputClass}
            placeholder="010-1234-5678"
          />
        </div>
      </div>

      {isEditing && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            상태
          </label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className={inputClass}
          >
            {CASE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          태그
        </label>
        <input
          name="tags"
          value={form.tags}
          onChange={handleChange}
          className={inputClass}
          placeholder="손해배상, 계약 (쉼표로 구분)"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !form.clientName.trim()}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : isEditing ? '수정' : '생성'}
        </button>
      </div>
    </form>
  )
}
