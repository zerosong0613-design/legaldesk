/**
 * 민사 서면 템플릿 5종
 * 사건 데이터를 받아 HTML 형식 Google Docs 내용을 반환
 */

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}

const STYLE = `
<style>
  body { font-family: 'Batang', serif; font-size: 12pt; line-height: 1.8; }
  h1 { text-align: center; font-size: 18pt; margin-bottom: 24pt; }
  h2 { font-size: 14pt; margin-top: 18pt; }
  .center { text-align: center; }
  .right { text-align: right; }
  .indent { margin-left: 24pt; }
  .field { color: #1a73e8; }
  table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
  td, th { border: 1px solid #999; padding: 6pt 10pt; }
  th { background: #f5f5f5; font-weight: bold; }
</style>
`

export const TEMPLATE_LIST = [
  { id: 'content_cert', label: '내용증명', icon: '📨' },
  { id: 'complaint', label: '소장', icon: '📋' },
  { id: 'answer', label: '답변서', icon: '📝' },
  { id: 'brief', label: '준비서면', icon: '📄' },
  { id: 'settlement', label: '화해권고서', icon: '🤝' },
]

/**
 * 내용증명
 */
function contentCertification(caseData, profile) {
  const sender = profile?.lawyerName || '[변호사명]'
  const senderOffice = profile?.officeName || '[사무소명]'
  const senderPhone = profile?.phone || '[연락처]'
  const recipient = caseData.opponent || caseData.opposingParty || '[수신인]'
  const client = caseData.clientName || '[의뢰인]'

  return `${STYLE}
<h1>내 용 증 명</h1>

<table>
  <tr><th width="20%">발신인</th><td>${client} (대리인: ${sender}, ${senderOffice})</td></tr>
  <tr><th>연락처</th><td>${senderPhone}</td></tr>
  <tr><th>수신인</th><td>${recipient}</td></tr>
  <tr><th>발신일</th><td>${today()}</td></tr>
</table>

<h2>1. 사실관계</h2>
<p class="indent field">[구체적인 사실관계를 기재하세요]</p>

<h2>2. 법적 근거</h2>
<p class="indent field">[관련 법조문 및 판례를 기재하세요]</p>

<h2>3. 요구사항</h2>
<p class="indent field">[구체적인 요구사항 및 이행기한을 기재하세요]</p>

<h2>4. 불이행 시 조치</h2>
<p class="indent">위 요구사항을 기한 내에 이행하지 않을 경우, 민·형사상 법적 조치를 취할 것임을 통지합니다.</p>

<br/>
<p class="right">${today()}</p>
<p class="right">발신인 대리인: ${senderOffice}</p>
<p class="right">변호사 ${sender}</p>
`
}

/**
 * 소장
 */
function complaint(caseData, profile) {
  const lawyer = profile?.lawyerName || '[변호사명]'
  const office = profile?.officeName || '[사무소명]'
  const phone = profile?.phone || '[연락처]'
  const client = caseData.clientName || '[원고]'
  const opponent = caseData.opponent || caseData.opposingParty || '[피고]'
  const court = caseData.court || '[관할법원]'

  return `${STYLE}
<h1>소 장</h1>

<table>
  <tr><th width="15%">원고</th><td>${client}</td></tr>
  <tr><th>대리인</th><td>변호사 ${lawyer} (${office}, ${phone})</td></tr>
  <tr><th>피고</th><td>${opponent}</td></tr>
</table>

<p class="center"><b>${court} 귀중</b></p>

<h2>청 구 취 지</h2>
<p class="indent">1. <span class="field">[청구취지를 기재하세요]</span></p>
<p class="indent">2. 소송비용은 피고의 부담으로 한다.</p>
<p class="indent">3. 제1항은 가집행할 수 있다.</p>
<p class="indent">라는 판결을 구합니다.</p>

<h2>청 구 원 인</h2>

<h3>1. 당사자의 지위</h3>
<p class="indent field">[당사자 관계 및 지위를 기재하세요]</p>

<h3>2. 사실관계</h3>
<p class="indent field">[구체적인 사실관계를 기재하세요]</p>

<h3>3. 피고의 책임</h3>
<p class="indent field">[피고의 법적 책임 근거를 기재하세요]</p>

<h3>4. 손해의 발생 및 범위</h3>
<p class="indent field">[손해 내역 및 금액을 기재하세요]</p>

<h2>입 증 방 법</h2>
<p class="indent">1. 갑 제1호증  <span class="field">[증거명]</span></p>
<p class="indent">2. 갑 제2호증  <span class="field">[증거명]</span></p>

<h2>첨 부 서 류</h2>
<p class="indent">1. 위 입증방법 각 1통</p>
<p class="indent">2. 소장 부본 1통</p>
<p class="indent">3. 송달료 납부서 1통</p>

<br/>
<p class="right">${today()}</p>
<p class="right">원고 대리인</p>
<p class="right">${office}</p>
<p class="right">변호사 ${lawyer}</p>
`
}

/**
 * 답변서
 */
function answer(caseData, profile) {
  const lawyer = profile?.lawyerName || '[변호사명]'
  const office = profile?.officeName || '[사무소명]'
  const client = caseData.clientName || '[피고]'
  const opponent = caseData.opponent || caseData.opposingParty || '[원고]'
  const court = caseData.court || '[관할법원]'
  const caseNumber = caseData.caseNumber || '[사건번호]'

  return `${STYLE}
<h1>답 변 서</h1>

<table>
  <tr><th width="15%">사건</th><td>${caseNumber}</td></tr>
  <tr><th>원고</th><td>${opponent}</td></tr>
  <tr><th>피고</th><td>${client}</td></tr>
  <tr><th>대리인</th><td>변호사 ${lawyer} (${office})</td></tr>
</table>

<p class="center"><b>${court} 귀중</b></p>

<h2>답 변 취 지</h2>
<p class="indent">1. 원고의 청구를 기각한다.</p>
<p class="indent">2. 소송비용은 원고의 부담으로 한다.</p>
<p class="indent">라는 판결을 구합니다.</p>

<h2>답 변 이 유</h2>

<h3>1. 원고 주장에 대한 인부</h3>
<p class="indent field">[원고 주장 사실에 대한 인정/부인을 기재하세요]</p>

<h3>2. 피고의 주장</h3>
<p class="indent field">[피고의 반박 주장을 기재하세요]</p>

<h3>3. 법적 근거</h3>
<p class="indent field">[관련 법조문 및 판례를 기재하세요]</p>

<h2>입 증 방 법</h2>
<p class="indent">1. 을 제1호증  <span class="field">[증거명]</span></p>

<br/>
<p class="right">${today()}</p>
<p class="right">피고 대리인</p>
<p class="right">${office}</p>
<p class="right">변호사 ${lawyer}</p>
`
}

/**
 * 준비서면
 */
function brief(caseData, profile) {
  const lawyer = profile?.lawyerName || '[변호사명]'
  const office = profile?.officeName || '[사무소명]'
  const client = caseData.clientName || '[당사자]'
  const court = caseData.court || '[관할법원]'
  const caseNumber = caseData.caseNumber || '[사건번호]'
  const position = caseData.clientPosition === 'defendant' ? '피고' : '원고'

  return `${STYLE}
<h1>준 비 서 면</h1>

<table>
  <tr><th width="15%">사건</th><td>${caseNumber}</td></tr>
  <tr><th>${position}</th><td>${client}</td></tr>
  <tr><th>대리인</th><td>변호사 ${lawyer} (${office})</td></tr>
</table>

<p class="center"><b>${court} 귀중</b></p>

<p>위 사건에 관하여 ${position} 대리인은 다음과 같이 준비서면을 제출합니다.</p>

<h2>1. 상대방 주장에 대한 반박</h2>
<p class="indent field">[상대방 주장 요지 및 반박 내용을 기재하세요]</p>

<h2>2. 추가 주장</h2>
<p class="indent field">[새로운 주장 사항을 기재하세요]</p>

<h2>3. 증거 설명</h2>
<p class="indent field">[새로 제출하는 증거에 대한 설명을 기재하세요]</p>

<h2>입 증 방 법</h2>
<p class="indent">1. <span class="field">[증거번호]</span>  <span class="field">[증거명]</span></p>

<br/>
<p class="right">${today()}</p>
<p class="right">${position} 대리인</p>
<p class="right">${office}</p>
<p class="right">변호사 ${lawyer}</p>
`
}

/**
 * 화해권고서
 */
function settlement(caseData, profile) {
  const lawyer = profile?.lawyerName || '[변호사명]'
  const office = profile?.officeName || '[사무소명]'
  const client = caseData.clientName || '[당사자1]'
  const opponent = caseData.opponent || caseData.opposingParty || '[당사자2]'
  const court = caseData.court || '[관할법원]'
  const caseNumber = caseData.caseNumber || '[사건번호]'

  return `${STYLE}
<h1>화 해 권 고 서</h1>

<table>
  <tr><th width="15%">사건</th><td>${caseNumber}</td></tr>
  <tr><th>당사자1</th><td>${client}</td></tr>
  <tr><th>당사자2</th><td>${opponent}</td></tr>
</table>

<p class="center"><b>${court}</b></p>

<h2>화해 조건</h2>

<p class="indent">1. <span class="field">[금전 지급 조건: 금액, 지급기한, 지급방법 등]</span></p>
<p class="indent">2. <span class="field">[이행 조건: 의무사항, 이행기한 등]</span></p>
<p class="indent">3. <span class="field">[기타 합의 조건]</span></p>
<p class="indent">4. 소송비용은 각자 부담한다.</p>

<h2>화해 사유</h2>
<p class="indent field">[화해를 권고하는 사유를 기재하세요]</p>

<br/>
<p class="right">${today()}</p>
<p class="right">작성자: ${office}</p>
<p class="right">변호사 ${lawyer}</p>
`
}

const GENERATORS = {
  content_cert: contentCertification,
  complaint,
  answer,
  brief,
  settlement,
}

/**
 * 템플릿 HTML 생성
 * @param {string} templateId - TEMPLATE_LIST의 id
 * @param {object} caseData - 사건 정보
 * @param {object} profile - 변호사 프로필
 * @returns {string} HTML 문자열
 */
export function generateTemplate(templateId, caseData, profile) {
  const gen = GENERATORS[templateId]
  if (!gen) throw new Error(`알 수 없는 템플릿: ${templateId}`)
  return gen(caseData, profile)
}
