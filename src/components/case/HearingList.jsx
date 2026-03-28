import { useState } from 'react'
import { useCaseStore } from '../../store/caseStore'
import { useUiStore } from '../../store/uiStore'
import { createCalendarEvent, deleteCalendarEvent } from '../../api/calendar'
import { readCaseDetail, writeCaseDetail } from '../../api/drive'
import Modal from '../ui/Modal'

const HEARING_TYPES = ['변론', '조정', '선고', '증인신문', '감정', '기타']

function formatDateTime(dateStr) {
  const d = new Date(dateStr)
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

function getDday(dateStr) {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `D+${Math.abs(diff)}`
  if (diff === 0) return 'D-Day'
  return `D-${diff}`
}

export default function HearingList({ caseData }) {
  const { loadCaseDetail, updateCase } = useCaseStore()
  const { showToast } = useUiStore()
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    datetime: '',
    type: '변론',
    court: caseData.court || '',
    room: '',
    note: '',
  })

  const hearings = [...(caseData.hearings || [])].sort(
    (a, b) => new Date(a.datetime) - new Date(b.datetime)
  )

  const upcomingHearings = hearings.filter((h) => new Date(h.datetime) >= new Date())
  const pastHearings = hearings.filter((h) => new Date(h.datetime) < new Date())

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.datetime) return

    setIsSubmitting(true)
    try {
      // Calendar 이벤트 생성
      const calEvent = await createCalendarEvent({
        ...form,
        caseNumber: caseData.caseNumber,
        clientName: caseData.clientName,
      })

      const newHearing = {
        id: `h-${Date.now()}`,
        datetime: new Date(form.datetime).toISOString(),
        type: form.type,
        court: form.court,
        room: form.room,
        note: form.note,
        calendarEventId: calEvent?.id || null,
        createdAt: new Date().toISOString(),
      }

      // Drive에 저장
      const detail = await readCaseDetail(caseData.driveFileId)
      detail.hearings = [...(detail.hearings || []), newHearing]
      await writeCaseDetail(caseData.driveFileId, detail)

      // 다음 기일 업데이트
      const nextHearing = detail.hearings
        .filter((h) => new Date(h.datetime) >= new Date())
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]

      if (nextHearing) {
        await updateCase(caseData.id, { nextHearingDate: nextHearing.datetime })
      }

      await loadCaseDetail(caseData.id)
      setShowForm(false)
      setForm({ datetime: '', type: '변론', court: caseData.court || '', room: '', note: '' })
      showToast('기일이 추가되었습니다.', 'success')
    } catch (err) {
      showToast(`기일 추가 실패: ${err.message}`, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (hearing) => {
    try {
      // Calendar 이벤트 삭제
      if (hearing.calendarEventId) {
        await deleteCalendarEvent(hearing.calendarEventId).catch(() => {})
      }

      // Drive에서 제거
      const detail = await readCaseDetail(caseData.driveFileId)
      detail.hearings = detail.hearings.filter((h) => h.id !== hearing.id)
      await writeCaseDetail(caseData.driveFileId, detail)

      // 다음 기일 업데이트
      const nextHearing = detail.hearings
        .filter((h) => new Date(h.datetime) >= new Date())
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]

      await updateCase(caseData.id, {
        nextHearingDate: nextHearing?.datetime || null,
      })

      await loadCaseDetail(caseData.id)
      showToast('기일이 삭제되었습니다.', 'success')
    } catch (err) {
      showToast(`기일 삭제 실패: ${err.message}`, 'error')
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

  const renderHearing = (hearing) => {
    const isPast = new Date(hearing.datetime) < new Date()
    return (
      <div
        key={hearing.id}
        className={`flex items-start justify-between p-4 rounded-lg border ${
          isPast ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${isPast ? 'text-gray-500' : 'text-gray-900'}`}>
              {hearing.type}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                isPast
                  ? 'bg-gray-100 text-gray-500'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {getDday(hearing.datetime)}
            </span>
          </div>
          <p className={`text-sm ${isPast ? 'text-gray-400' : 'text-gray-600'}`}>
            {formatDateTime(hearing.datetime)}
          </p>
          {(hearing.court || hearing.room) && (
            <p className="text-sm text-gray-500 mt-1">
              {hearing.court}{hearing.room && ` ${hearing.room}`}
            </p>
          )}
          {hearing.note && (
            <p className="text-sm text-gray-500 mt-1">{hearing.note}</p>
          )}
        </div>
        <button
          onClick={() => handleDelete(hearing)}
          className="ml-2 p-1 text-gray-400 hover:text-red-500"
          title="삭제"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">기일 목록</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showForm ? '취소' : '+ 기일 추가'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">일시 *</label>
              <input
                type="datetime-local"
                value={form.datetime}
                onChange={(e) => setForm({ ...form, datetime: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">유형</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className={inputClass}
              >
                {HEARING_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">법원</label>
              <input
                value={form.court}
                onChange={(e) => setForm({ ...form, court: e.target.value })}
                className={inputClass}
                placeholder="서울중앙지방법원"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">법정</label>
              <input
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className={inputClass}
                placeholder="305호"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={inputClass}
              placeholder="기일 관련 메모"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !form.datetime}
              className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {isSubmitting ? '추가 중...' : '기일 추가'}
            </button>
          </div>
        </form>
      )}

      {upcomingHearings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">예정된 기일</p>
          <div className="space-y-2">
            {upcomingHearings.map(renderHearing)}
          </div>
        </div>
      )}

      {pastHearings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">지난 기일</p>
          <div className="space-y-2">
            {pastHearings.map(renderHearing)}
          </div>
        </div>
      )}

      {hearings.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 text-center py-8">
          등록된 기일이 없습니다
        </p>
      )}
    </div>
  )
}
