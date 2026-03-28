/**
 * 법원 사건검색 결과 텍스트 파서
 *
 * 입력 예시:
 * 사건번호    2024누36267    사건명    [전자]지원금지급제한 처분 등 취소
 * 원고    주OOOOOOOO    피고    서OOOOOOOOO
 * 재판부    제8-1행정부(다) (전화:02-530-2225)
 * 접수일    2024.02.27    종국결과    2024.10.18 항소기각
 * ...
 */

function extractField(text, fieldName) {
  // "필드명    값" 또는 "필드명\t값" 패턴 매칭
  // 다음 필드명이 나올 때까지의 값을 추출
  const regex = new RegExp(
    `${fieldName}[\\s\\t]+([^\\n]+?)(?:\\s{2,}|\\t|$)`,
    'm'
  )
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

function extractPairedFields(text, field1, field2) {
  // "필드1    값1    필드2    값2" 패턴
  const regex = new RegExp(
    `${field1}[\\s\\t]+(.+?)\\s{2,}${field2}[\\s\\t]+(.+?)(?:\\s{2,}|$)`,
    'm'
  )
  const match = text.match(regex)
  if (match) {
    return [match[1].trim(), match[2].trim()]
  }
  return [extractField(text, field1), extractField(text, field2)]
}

function detectCaseType(caseNumber, caseName) {
  const combined = `${caseNumber} ${caseName}`

  if (/형|고합|고단|고정/.test(caseNumber)) return '형사'
  if (/가합|가단|가소|나|드/.test(caseNumber)) return '민사'
  if (/느|르|므/.test(caseNumber)) return '가사'
  if (/누|구합|구단/.test(caseNumber)) return '행정'

  if (/취소|처분|행정/.test(caseName)) return '행정'
  if (/이혼|양육|상속/.test(caseName)) return '가사'
  if (/사기|횡령|폭행|살인/.test(caseName)) return '형사'

  return '민사'
}

function detectCourt(division) {
  // 재판부 정보에서 법원 추론
  if (!division) return ''

  const phone = division.match(/전화[:\s]*([\d-]+)/)
  const phoneNum = phone ? phone[1] : ''

  // 전화번호 앞자리로 법원 추정
  if (phoneNum.startsWith('02-530')) return '서울고등법원'
  if (phoneNum.startsWith('02-3480')) return '서울중앙지방법원'
  if (phoneNum.startsWith('02-2192')) return '서울동부지방법원'
  if (phoneNum.startsWith('02-6905')) return '서울서부지방법원'
  if (phoneNum.startsWith('02-3219')) return '서울남부지방법원'
  if (phoneNum.startsWith('02-950')) return '서울북부지방법원'
  if (phoneNum.startsWith('031-920')) return '의정부지방법원'
  if (phoneNum.startsWith('031-212')) return '수원지방법원'
  if (phoneNum.startsWith('032-860')) return '인천지방법원'
  if (phoneNum.startsWith('042-470')) return '대전지방법원'
  if (phoneNum.startsWith('062-239')) return '광주지방법원'
  if (phoneNum.startsWith('053-757')) return '대구지방법원'
  if (phoneNum.startsWith('051-590')) return '부산지방법원'

  // 재판부명에서 추정
  if (/고등/.test(division)) return '고등법원'
  if (/대법/.test(division)) return '대법원'

  return ''
}

function detectStatus(result) {
  if (!result) return '진행'

  if (/기각|각하|취하|화해|조정|인낙/.test(result)) return '종결'
  if (/선고|판결/.test(result)) return '종결'
  if (/항소|상고/.test(result)) return '진행'

  return '진행'
}

function parseDate(dateStr) {
  if (!dateStr) return null
  // "2024.02.27" → "2024-02-27"
  const match = dateStr.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (!match) return null
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
}

/**
 * 법원 사건검색 결과 텍스트를 파싱
 * @param {string} text - 붙여넣기한 텍스트
 * @returns {Object|null} 파싱된 사건 데이터 또는 null
 */
export function parseCourtCase(text) {
  if (!text || !text.trim()) return null

  // 사건번호가 있는지 확인 (최소한의 유효성 검사)
  if (!/사건번호/.test(text) && !/\d{4}[가-힣]{1,3}\d+/.test(text)) {
    return null
  }

  const [plaintiff, defendant] = extractPairedFields(text, '원고', '피고')
  const [caseNumber, caseName] = extractPairedFields(text, '사건번호', '사건명')
  const division = extractField(text, '재판부')
  const [filingDate, result] = extractPairedFields(text, '접수일', '종국결과')
  const [plaintiffAmount, defendantAmount] = extractPairedFields(text, '원고소가', '피고소가')
  const judgmentDate = extractField(text, '판결도달일')
  const confirmDate = extractField(text, '확정일')

  // 사건명에서 [전자] 태그 제거
  const cleanCaseName = caseName.replace(/\[전자\]/g, '').trim()

  const court = detectCourt(division)
  const type = detectCaseType(caseNumber, cleanCaseName)
  const status = detectStatus(result)

  // 종국결과에서 날짜와 결과 분리
  let resultDate = ''
  let resultText = ''
  if (result) {
    const dateMatch = result.match(/(\d{4}\.\d{2}\.\d{2})\s*(.*)/)
    if (dateMatch) {
      resultDate = dateMatch[1]
      resultText = dateMatch[2]
    } else {
      resultText = result
    }
  }

  return {
    caseNumber: caseNumber || '',
    caseName: cleanCaseName || '',
    clientName: plaintiff || '',
    opponent: defendant || '',
    type,
    status,
    court,
    division: division ? division.replace(/\(전화[^)]*\)/, '').trim() : '',
    filingDate: parseDate(filingDate),
    resultDate: parseDate(resultDate),
    resultText,
    judgmentDate: parseDate(judgmentDate),
    confirmDate: parseDate(confirmDate),
    plaintiffAmount: plaintiffAmount || '',
    defendantAmount: defendantAmount || '',
  }
}
