import { useState } from 'react'
import { useCaseStore } from '../../store/caseStore'
import { useUiStore } from '../../store/uiStore'
import { createCalendarEvent, deleteCalendarEvent, fetchCalendarEvents, matchEventsToCaseNumber } from '../../api/calendar'
import { readCaseDetail, writeCaseDetail } from '../../api/drive'

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
  const [isSyncing, setIsSyncing] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState(null) // null = not fetched
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

  // ─── 캘린더에서 기일 가져오기 ───
  const handleSyncFromCalendar = async () => {
    if (!caseData.caseNumber) {
      showToast('사건번호가 없어 캘린더 매칭이 불가합니다.', 'error')
      return
    }

    setIsSyncing(true)
    try {
      // 1년 전 ~ 1년 후 범위로 조회
      const now = new Date()
      const timeMin = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      const timeMax = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())

      const allEvents = await fetchCalendarEvents(timeMin.toISOString(), timeMax.toISOString())
      const matched = matchEventsToCaseNumber(allEvents, caseData.caseNumber)

      if (matched.length === 0) {
        showToast('캘린더에서 매칭되는 기일을 찾을 수 없습니다.', 'info')
        setCalendarEvents([])
        return
      }

      // 이미 등록된 기일과 중복 제거
      const existingEventIds = new Set(
        hearings.map((h) => h.calendarEventId).filter(Boolean)
      )
      const existingDatetimes = new Set(
        hearings.map((h) => new Date(h.datetime).getTime())
      )

      const newEvents = matched.filter(
        (ev) =>
          !existingEventIds.has(ev.calendarEventId) &&
          !existingDatetimes.has(new Date(ev.datetime).getTime())
      )

      setCalendarEvents(newEvents)

      if (newEvents.length === 0) {
        showToast('모든 기일이 이미 등록되어 있습니다.', 'info')
      }
    } catch (err) {
      showToast(`캘린더 조회 실패: ${err.message}`, 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleImportEvents = async () => {
    if (!calendarEvents?.length) return

    setIsSyncing(true)
    try {
      const detail = await readCaseDetail(caseData.driveFileId)

      const newHearings = calendarEvents.map((ev) => ({
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        datetime: new Date(ev.datetime).toISOString(),
        type: '변론',
        court: caseData.court || '',
        room: ev.location || '',
        note: `[캘린더 가져오기] ${ev.summary}`,
        calendarEventId: ev.calendarEventId,
        createdAt: new Date().toISOString(),
      }))

      detail.hearings = [...(detail.hearings || []), ...newHearings]
      await writeCaseDetail(caseData.driveFileId, detail)

      // 다음 기일 업데이트
      const nextHearing = detail.hearings
        .filter((h) => new Date(h.datetime) >= new Date())
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]

      if (nextHearing) {
        await updateCase(caseData.id, { nextHearingDate: nextHearing.datetime })
      }

      await loadCaseDetail(caseData.id)
      setCalendarEvents(null)
      showToast(`${newHearings.length}개 기일을 가져왔습니다.`, 'success')
    } catch (err) {
      showToast(`기일 가져오기 실패: ${err.message}`, 'error')
    } finally {
      setIsSyncing(false)
    }
  }

  // ─── 기일 수동 추가 ───
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.datetime) return

    setIsSubmitting(true)
    try {
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

      const detail = await readCaseDetail(caseData.driveFileId)
      detail.hearings = [...(detail.hearings || []), newHearing]
      await writeCaseDetail(caseData.driveFileId, detail)

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
      if (hearing.calendarEventId) {
        await deleteCalendarEvent(hearing.calendarEventId).catch(() => {})
      }

      const detail = await readCaseDetail(caseData.driveFileId)
      detail.hearings = detail.hearings.filter((h) => h.id !== hearing.id)
      await writeCaseDetail(caseData.driveFileId, detail)

      const nextHearing = detail.hearings
        .filter((h) => new Date(h.datetime) >= new Date())
        .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))[0]

      await updateCase(caseData.id, { nextHearingDate: nextHearing?.datetime || null })
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
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              isPast ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
            }`}>
              {getDday(hearing.datetime)}
            </span>
            {hearing.calendarEventId && (
              <span className="text-xs text-green-600">📅</span>
            )}
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
        <div className="flex gap-2">
          <button
            onClick={handleSyncFromCalendar}
            disabled={isSyncing}
            className="text-sm text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
          >
            {isSyncing ? '조회 중...' : '📅 캘린더에서 가져오기'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showForm ? '취소' : '+ 기일 추가'}
          </button>
        </div>
      </div>

      {/* 캘린더 가져오기 결과 */}
      {calendarEvents !== null && calendarEvents.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-green-800">
              캘린더에서 {calendarEvents.length}개 기일 발견
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => setCalendarEvents(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                닫기
              </button>
              <button
                onClick={handleImportEvents}
                disabled={isSyncing}
                className="px-3 py-1.5 text-xs text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
              >
                {isSyncing ? '가져오는 중...' : '전부 가져오기'}
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {calendarEvents.map((ev) => (
              <div key={ev.id} className="text-sm text-green-700 flex items-center gap-2">
                <span className="text-xs text-green-500">{formatDateTime(ev.datetime)}</span>
                <span>{ev.summary}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 수동 추가 폼 */}
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
          <div className="space-y-2">{upcomingHearings.map(renderHearing)}</div>
        </div>
      )}

      {pastHearings.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">지난 기일</p>
          <div className="space-y-2">{pastHearings.map(renderHearing)}</div>
        </div>
      )}

      {hearings.length === 0 && !showForm && calendarEvents === null && (
        <p className="text-sm text-gray-500 text-center py-8">
          등록된 기일이 없습니다. 캘린더에서 가져오거나 직접 추가하세요.
        </p>
      )}
    </div>
  )
}
