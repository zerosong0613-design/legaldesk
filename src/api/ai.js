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
