/**
 * Vercel Serverless Function — AI 텍스트 요약
 * POST /api/summarize
 * Body: { text: string, type: 'activity' | 'kakao' | 'case' }
 * Returns: { summary: string }
 *
 * 환경변수: ANTHROPIC_API_KEY (Vercel 대시보드에서 설정)
 */

const SYSTEM_PROMPTS = {
  activity: `당신은 한국 법률사무소의 사건 관리 어시스턴트입니다.
활동기록(상담, 수사입회, 접견 등)을 간결하게 요약해주세요.
- 핵심 내용 3-5개 bullet point
- 후속 조치가 필요한 사항 별도 표시
- 한국어로 작성`,

  kakao: `당신은 한국 법률사무소의 사건 관리 어시스턴트입니다.
의뢰인과의 카카오톡 대화 내용을 요약해주세요.
- 의뢰인의 주요 요청사항
- 변호사의 안내/답변 요지
- 미해결 사항이나 후속 필요 사항
- 한국어로 작성`,

  case: `당신은 한국 법률사무소의 사건 관리 어시스턴트입니다.
사건의 전체 활동기록과 메모를 기반으로 사건 현황을 요약해주세요.
- 사건 진행 경과 (시간순)
- 현재 상태
- 향후 예상 일정/필요 조치
- 주요 쟁점 정리
- 한국어로 작성`,
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: 'AI 요약 기능이 아직 설정되지 않았습니다. 관리자에게 문의하세요.',
      code: 'API_KEY_NOT_SET',
    })
  }

  const { text, type = 'activity' } = req.body || {}
  if (!text || !text.trim()) {
    return res.status(400).json({ error: '요약할 텍스트가 없습니다.' })
  }

  const systemPrompt = SYSTEM_PROMPTS[type] || SYSTEM_PROMPTS.activity

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `다음 내용을 요약해주세요:\n\n${text.slice(0, 8000)}` },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: `AI API 오류: ${response.status}` })
    }

    const data = await response.json()
    const summary = data.content?.[0]?.text || '요약을 생성할 수 없습니다.'

    return res.status(200).json({ summary })
  } catch (err) {
    return res.status(500).json({ error: `요약 실패: ${err.message}` })
  }
}
