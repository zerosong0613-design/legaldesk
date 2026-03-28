import { useState } from 'react'
import { parseCourtCase } from '../../utils/courtCaseParser'

const CASE_TYPES = ['민사', '형사', '가사', '행정', '기타']
const CASE_STATUSES = ['접수', '진행', '종결', '보류']

export default function CaseForm({ initialData, onSubmit, onCancel }) {
  const isEditing = !!initialData

  const [form, setForm] = useState({
    caseNumber: initialData?.caseNumber || '',
    caseName: initialData?.caseName || '',
    clientName: initialData?.clientName || '',
    clientEmail: initialData?.clientEmail || '',
    clientPhone: initialData?.clientPhone || '',
    opponent: initialData?.opponent || '',
    type: initialData?.type || '민사',
    status: initialData?.status || '접수',
    court: initialData?.court || '',
    division: initialData?.division || '',
    tags: initialData?.tags?.join(', ') || '',
  })

  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handlePaste = () => {
    if (!pasteText.trim()) return

    const parsed = parseCourtCase(pasteText)
    if (!parsed) {
      alert('법원 사건 정보를 인식할 수 없습니다. 사건검색 결과를 그대로 붙여넣기 해주세요.')
      return
    }

    setForm({
      ...form,
      caseNumber: parsed.caseNumber || form.caseNumber,
      caseName: parsed.caseName || form.caseName,
      clientName: parsed.clientName || form.clientName,
      opponent: parsed.opponent || form.opponent,
      type: parsed.type || form.type,
      status: parsed.status || form.status,
      court: parsed.court || form.court,
      division: parsed.division || form.division,
    })
    setShowPaste(false)
    setPasteText('')
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
      {/* 붙여넣기 자동입력 */}
      {!isEditing && (
        <div>
          {!showPaste ? (
            <button
              type="button"
              onClick={() => setShowPaste(true)}
              className="w-full py-2.5 border-2 border-dashed border-blue-300 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition-colors"
            >
              법원 사건검색 결과 붙여넣기로 자동입력
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="법원 사건검색 결과를 여기에 붙여넣기 하세요..."
                className="w-full h-28 px-3 py-2 border border-blue-300 rounded-lg text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaste(false)
                    setPasteText('')
                  }}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={!pasteText.trim()}
                  className="px-3 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  자동 채우기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          의뢰인(원고) <span className="text-red-500">*</span>
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          상대방(피고)
        </label>
        <input
          name="opponent"
          value={form.opponent}
          onChange={handleChange}
          className={inputClass}
          placeholder="상대방"
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
          사건명
        </label>
        <input
          name="caseName"
          value={form.caseName}
          onChange={handleChange}
          className={inputClass}
          placeholder="손해배상(기)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            재판부
          </label>
          <input
            name="division"
            value={form.division}
            onChange={handleChange}
            className={inputClass}
            placeholder="제1민사부"
          />
        </div>
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
