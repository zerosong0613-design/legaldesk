/**
 * Vercel Serverless Function — 오디오 파일 → 텍스트 변환 (OpenAI Whisper)
 * POST /api/transcribe
 * Body: multipart/form-data { file: audio file }
 * Returns: { text: string }
 *
 * 환경변수: OPENAI_API_KEY (Vercel 대시보드에서 설정)
 */

export const config = {
  api: {
    bodyParser: false, // multipart 직접 처리
  },
}

async function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function extractFile(buffer, contentType) {
  const boundary = contentType.split('boundary=')[1]
  if (!boundary) return null

  const boundaryBuffer = Buffer.from(`--${boundary}`)
  const parts = []
  let start = 0

  while (true) {
    const idx = buffer.indexOf(boundaryBuffer, start)
    if (idx === -1) break
    if (start > 0) {
      parts.push(buffer.slice(start, idx - 2)) // -2 for \r\n
    }
    start = idx + boundaryBuffer.length + 2 // +2 for \r\n
  }

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd === -1) continue
    const headers = part.slice(0, headerEnd).toString()
    if (headers.includes('filename=')) {
      const filenameMatch = headers.match(/filename="([^"]*)"/)
      const contentTypeMatch = headers.match(/Content-Type:\s*(.+)/i)
      return {
        data: part.slice(headerEnd + 4),
        filename: filenameMatch?.[1] || 'audio.wav',
        contentType: contentTypeMatch?.[1]?.trim() || 'audio/wav',
      }
    }
  }
  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: '음성 변환 기능이 아직 설정되지 않았습니다. 관리자에게 문의하세요.',
      code: 'API_KEY_NOT_SET',
    })
  }

  try {
    const body = await parseMultipart(req)
    const file = extractFile(body, req.headers['content-type'])

    if (!file) {
      return res.status(400).json({ error: '오디오 파일이 없습니다.' })
    }

    // Whisper API 호출
    const formData = new FormData()
    formData.append('file', new Blob([file.data], { type: file.contentType }), file.filename)
    formData.append('model', 'whisper-1')
    formData.append('language', 'ko')
    formData.append('response_format', 'json')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    })

    if (!response.ok) {
      return res.status(502).json({ error: `Whisper API 오류: ${response.status}` })
    }

    const data = await response.json()
    return res.status(200).json({ text: data.text || '' })
  } catch (err) {
    return res.status(500).json({ error: `변환 실패: ${err.message}` })
  }
}
