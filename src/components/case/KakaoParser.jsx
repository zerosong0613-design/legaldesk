import { useState, useRef } from 'react'
import { parseKakaoChat, textToMemo } from '../../utils/kakaoParser'
import { useCaseStore } from '../../store/caseStore'
import { useUiStore } from '../../store/uiStore'
import { readCaseDetail, writeCaseDetail } from '../../api/drive'
import { formatDateTime } from '../../utils/dateUtils'

export default function KakaoParser({ caseData }) {
  const { loadCaseDetail } = useCaseStore()
  const { showToast } = useUiStore()
  const fileInputRef = useRef(null)

  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const kakaoMessages = caseData.kakaoMessages || []

  const handleParse = () => {
    if (!text.trim()) return

    const messages = parseKakaoChat(text, caseData.clientName)

    if (messages.length === 0) {
      // 파싱 실패 → 메모로 저장할지 미리보기
      setPreview({ type: 'memo', data: textToMemo(text), count: 0 })
    } else {
      setPreview({ type: 'messages', data: messages, count: messages.length })
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      setText(ev.target.result)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!preview) return

    setIsSaving(true)
    try {
      const detail = await readCaseDetail(caseData.driveFileId)

      if (preview.type === 'messages') {
        detail.kakaoMessages = [...(detail.kakaoMessages || []), ...preview.data]
      } else {
        detail.memos = [...(detail.memos || []), preview.data]
      }

      await writeCaseDetail(caseData.driveFileId, detail)
      await loadCaseDetail(caseData.id)

      setText('')
      setPreview(null)
      showToast(
        preview.type === 'messages'
          ? `${preview.count}개 메시지가 저장되었습니다.`
          : '메모로 저장되었습니다.',
        'success'
      )
    } catch (err) {
      showToast(`저장 실패: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 입력 영역 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">카카오톡 대화 가져오기</h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            txt 파일 업로드
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setPreview(null)
          }}
          placeholder="카카오톡 대화를 붙여넣기 하세요...&#10;&#10;iOS: 2026년 3월 1일 오후 2:23, 홍길동 : 메시지&#10;Android: 2026-03-01 14:23, 홍길동 : 메시지"
          className="w-full h-40 px-4 py-3 border border-gray-300 rounded-xl text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <div className="flex justify-end gap-2">
          {text.trim() && (
            <button
              onClick={() => {
                setText('')
                setPreview(null)
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              지우기
            </button>
          )}
          <button
            onClick={handleParse}
            disabled={!text.trim()}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            파싱하기
          </button>
        </div>
      </div>

      {/* 미리보기 */}
      {preview && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700">
              {preview.type === 'messages'
                ? `${preview.count}개 메시지 파싱됨`
                : '파싱 실패 — 메모로 저장'}
            </h4>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : 'Drive에 저장'}
            </button>
          </div>

          {preview.type === 'messages' ? (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {preview.data.slice(0, 50).map((msg, i) => (
                <div key={i} className="text-sm py-1">
                  <span className={`font-medium ${msg.isFromClient ? 'text-blue-700' : 'text-gray-700'}`}>
                    {msg.sender}
                  </span>
                  <span className="text-gray-400 text-xs ml-2">
                    {formatDateTime(msg.datetime)}
                  </span>
                  <p className="text-gray-600 mt-0.5">
                    {msg.message}
                    {msg.hasAttachment && (
                      <span className="text-xs text-orange-500 ml-1">[첨부]</span>
                    )}
                  </p>
                </div>
              ))}
              {preview.data.length > 50 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  ...외 {preview.data.length - 50}개 메시지
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-5">
              {preview.data.content}
            </p>
          )}
        </div>
      )}

      {/* 저장된 메시지 목록 */}
      {kakaoMessages.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            저장된 대화 ({kakaoMessages.length}건)
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {kakaoMessages.map((msg, i) => (
              <div key={msg.id || i} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-sm font-medium ${
                      msg.isFromClient ? 'text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    {msg.sender}
                    {msg.isFromClient && (
                      <span className="text-xs text-blue-500 ml-1">(의뢰인)</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(msg.datetime)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {msg.message}
                  {msg.hasAttachment && (
                    <span className="text-xs text-orange-500 ml-1">[첨부]</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {kakaoMessages.length === 0 && !preview && !text && (
        <p className="text-sm text-gray-500 text-center py-8">
          카카오톡 대화를 붙여넣거나 txt 파일을 업로드하세요
        </p>
      )}
    </div>
  )
}
