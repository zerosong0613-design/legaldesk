/**
 * AI 요약 API 클라이언트 래퍼
 * Vercel serverless function /api/summarize 호출
 */

export async function summarizeText(text, type = 'activity') {
  const res = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, type }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || 'AI 요약 실패')
  }

  return data.summary
}

/**
 * 오디오 파일 → 텍스트 변환 (Whisper API)
 * @param {File} file - 오디오 파일 (.mp3, .m4a, .wav 등)
 * @returns {string} 변환된 텍스트
 */
export async function transcribeAudio(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || '음성 변환 실패')
  }

  return data.text
}
