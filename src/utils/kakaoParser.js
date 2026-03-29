/**
 * 카카오톡 대화 내보내기 파서
 * iOS / Android 포맷 양쪽 지원
 *
 * iOS:  "2026년 3월 1일 오후 2:23, 홍길동 : 메시지"
 * Android (날짜포함): "2026-03-01 14:23, 홍길동 : 메시지"
 * Android (한글): "2026. 3. 1. 오후 2:23, 홍길동 : 메시지"
 * Android (괄호): "[홍길동] [오후 2:23] 메시지"  ← 날짜는 구분선에서 가져옴
 * 날짜 구분선: "--------------- 2026년 3월 1일 토요일 ---------------"
 *              "2026년 3월 1일 토요일"  (구분선 없이 날짜만)
 */

// iOS 메시지 패턴: "2026년 3월 1일 오전/오후 H:MM, 이름 : 메시지"
const IOS_MSG_RE =
  /^(\d{4})년 (\d{1,2})월 (\d{1,2})일 (오전|오후) (\d{1,2}):(\d{2}),\s*(.+?)\s*:\s*([\s\S]*)$/

// Android 메시지 패턴: "2026-03-01 14:23, 이름 : 메시지" 또는 "2026. 3. 1. 오후 2:23, 이름 : 메시지"
const ANDROID_MSG_RE =
  /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}),\s*(.+?)\s*:\s*([\s\S]*)$/

const ANDROID_KR_MSG_RE =
  /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}):(\d{2}),\s*(.+?)\s*:\s*([\s\S]*)$/

// Android 괄호 포맷: "[이름] [오전/오후 H:MM] 메시지"
const ANDROID_BRACKET_RE =
  /^\[(.+?)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]\s*([\s\S]*)$/

// 날짜 구분선 패턴
const DATE_SEPARATOR_RE =
  /^-{3,}\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*-{3,}$/

// 날짜만 있는 줄 (구분선 없이): "2026년 3월 1일 토요일"
const DATE_LINE_RE =
  /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*[월화수목금토일]요일\s*$/

// 첨부 파일 키워드
const ATTACHMENT_KEYWORDS = ['사진', '동영상', '파일', '이모티콘', '음성메시지', 'Photo', 'Video']

function parseIosMessage(line) {
  const m = line.match(IOS_MSG_RE)
  if (!m) return null

  const [, year, month, day, ampm, hour, minute, sender, message] = m
  let h = parseInt(hour, 10)
  if (ampm === '오후' && h !== 12) h += 12
  if (ampm === '오전' && h === 12) h = 0

  const datetime = new Date(
    parseInt(year), parseInt(month) - 1, parseInt(day), h, parseInt(minute)
  )

  return { datetime, sender: sender.trim(), message: message.trim() }
}

function parseAndroidMessage(line, currentDate) {
  const m = line.match(ANDROID_MSG_RE)
  if (m) {
    const [, year, month, day, hour, minute, sender, message] = m
    const datetime = new Date(
      parseInt(year), parseInt(month) - 1, parseInt(day),
      parseInt(hour), parseInt(minute)
    )
    return { datetime, sender: sender.trim(), message: message.trim() }
  }

  const m2 = line.match(ANDROID_KR_MSG_RE)
  if (m2) {
    const [, year, month, day, ampm, hour, minute, sender, message] = m2
    let h = parseInt(hour, 10)
    if (ampm === '오후' && h !== 12) h += 12
    if (ampm === '오전' && h === 12) h = 0

    const datetime = new Date(
      parseInt(year), parseInt(month) - 1, parseInt(day), h, parseInt(minute)
    )
    return { datetime, sender: sender.trim(), message: message.trim() }
  }

  // [이름] [오전/오후 H:MM] 메시지
  const m3 = line.match(ANDROID_BRACKET_RE)
  if (m3) {
    const [, sender, ampm, hour, minute, message] = m3
    let h = parseInt(hour, 10)
    if (ampm === '오후' && h !== 12) h += 12
    if (ampm === '오전' && h === 12) h = 0

    const base = currentDate || new Date()
    const datetime = new Date(
      base.getFullYear(), base.getMonth(), base.getDate(), h, parseInt(minute)
    )
    return { datetime, sender: sender.trim(), message: (message || '').trim() }
  }

  return null
}

function parseDateSeparator(line) {
  const m = line.match(DATE_SEPARATOR_RE)
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))

  const m2 = line.trim().match(DATE_LINE_RE)
  if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3]))

  return null
}

function hasAttachment(message) {
  return ATTACHMENT_KEYWORDS.some((kw) => message.includes(kw))
}

/**
 * 카카오톡 텍스트를 파싱하여 메시지 배열 반환
 * @param {string} text - 카카오톡 내보내기 텍스트
 * @param {string} clientName - 의뢰인 이름 (isFromClient 판별용)
 * @returns {Array} 파싱된 메시지 배열
 */
export function parseKakaoChat(text, clientName = '') {
  if (!text || !text.trim()) return []

  const lines = text.split('\n')
  const messages = []
  let currentMsg = null
  let currentDate = null

  for (const line of lines) {
    // 날짜 구분선 체크
    const dateParsed = parseDateSeparator(line)
    if (dateParsed) {
      currentDate = dateParsed
      if (currentMsg) {
        messages.push(currentMsg)
        currentMsg = null
      }
      continue
    }

    // 새 메시지 파싱 시도 (iOS → Android 순)
    const parsed = parseIosMessage(line) || parseAndroidMessage(line, currentDate)

    if (parsed) {
      // 이전 메시지 저장
      if (currentMsg) {
        messages.push(currentMsg)
      }

      currentMsg = {
        id: `k-${Date.now()}-${messages.length}`,
        datetime: parsed.datetime.toISOString(),
        sender: parsed.sender,
        message: parsed.message,
        isFromClient:
          clientName && parsed.sender.includes(clientName),
        hasAttachment: hasAttachment(parsed.message),
        source: 'paste',
        importedAt: new Date().toISOString(),
      }
    } else if (currentMsg && line.trim()) {
      // 멀티라인 메시지: 이전 메시지에 추가
      currentMsg.message += '\n' + line
      if (hasAttachment(line)) {
        currentMsg.hasAttachment = true
      }
    }
  }

  // 마지막 메시지 저장
  if (currentMsg) {
    messages.push(currentMsg)
  }

  return messages
}

/**
 * 파싱 실패 시 원본 텍스트를 단일 메모로 변환
 * @param {string} text - 원본 텍스트
 * @returns {Object} 메모 객체
 */
export function textToMemo(text) {
  return {
    id: `m-${Date.now()}`,
    datetime: new Date().toISOString(),
    content: text,
    createdAt: new Date().toISOString(),
  }
}
