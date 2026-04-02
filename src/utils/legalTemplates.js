/**
 * 민사/형사 서면 템플릿
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

export const CIVIL_TEMPLATES = [
  { id: 'content_cert', label: '내용증명', icon: '📨' },
  { id: 'complaint', label: '소장', icon: '📋' },
  { id: 'answer', label: '답변서', icon: '📝' },
  { id: 'brief', label: '준비서면', icon: '📄' },
  { id: 'settlement', label: '화해권고서', icon: '🤝' },
]

export const CRIMINAL_TEMPLATES = [
  { id: 'criminal_complaint', label: '고소장', icon: '🔴' },
  { id: 'criminal_accusation', label: '고발장', icon: '🟠' },
  { id: 'defense_opinion', label: '변호인 의견서', icon: '📑' },
  { id: 'bail_request', label: '보석허가청구서', icon: '🔓' },
  { id: 'appeal', label: '항소장', icon: '⚖️' },
]

/** @deprecated — 하위 호환용 */
export const TEMPLATE_LIST = CIVIL_TEMPLATES

export function getTemplateList(caseType) {
  if (caseType === '형사') return CRIMINAL_TEMPLATES
  return CIVIL_TEMPLATES
}

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

// ─── 형사 서면 ───

/**
 * 고소장
 */
function criminalComplaint(caseData, profile) {
  const lawyer = profile?.lawyerName || '[변호사명]'
  const office = profile?.officeName || '[사무소명]'
  const phone = profile?.phone || '[연락처]'
  const client = caseData.clientName || '[고소인]'
  const opponent = caseData.opponent || caseData.opposingParty || '[피고소인]'
  const criminal = caseData.criminalInfo || {}

  return `${STYLE}
<h1>고 소 장</h1>

<table>
  <tr><th width="15%">고소인</th><td>${client}</td></tr>
  <tr><th>대리인</th><td>변호사 ${lawyer} (${office}, ${phone})</td></tr>
  <tr><th>피고소인</th><td>${opponent}</td></tr>
</table>

<h2>고 소 취 지</h2>
<p class="indent">피고소인의 아래 범죄사실을 고소하오니, 수사하여 처벌하여 주시기 바랍니다.</p>

<h2>범 죄 사 실</h2>

<h3>1. 당사자 관계</h3>
<p class="indent field">[고소인과 피고소인의 관계를 기재하세요]</p>

<h3>2. 범죄 일시 및 장소</h3>
<p class="indent field">[범죄 일시, 장소를 구체적으로 기재하세요]</p>

<h3>3. 범죄 행위</h3>
<p class="indent field">[피고소인의 구체적인 범죄 행위를 기재하세요]</p>

<h3>4. 적용 법조</h3>
<p class="indent field">[적용될 법조문을 기재하세요 (예: 형법 제347조 사기)]</p>

<h2>증 거 자 료</h2>
<p class="indent">1. <span class="field">[증거명]</span></p>
<p class="indent">2. <span class="field">[증거명]</span></p>

<h2>결 론</h2>
<p class="indent">위와 같은 범죄사실에 대하여 피고소인을 엄벌에 처하여 주시기 바랍니다.</p>

<br/>
<p class="right">${today()}</p>
<p class="right">고소인 대리인</p>
<p class="right">${office}</p>
<p class="right">변호사 ${lawyer}</p>
`
}

/**
 * 고발장
 */
function criminalAccusation(caseData, profile) {
  const lawyer = profile?.lawyerName || '[변호사명]'
  const office = profile?.officeName || '[사무소명]'
  const client = caseData.clientName || '[고발인]'
  const opponent = caseData.opponent || caseData.opposingParty || '[피고발인]'

  return `${STYLE}
<h1>고 발 장</h1>

<table>
  <tr><th width="15%">고발인</th><td>${client}</td></tr>
  <tr><th>대리인</th><td>변호사 ${lawyer} (${office})</td></tr>
  <tr><th>피고발인</th><td>${opponent}</td></tr>
</table>

<h2>고 발 취 지</h2>
<p class="indent">피고발인의 아래 범죄사실을 고발하오니, 수사하여 처벌하여 주시기 바랍니다.</p>

<h2>범 죄 사 실</h2>
<p class="indent field">[구체적인 범죄 사실을 기재하세요]</p>

<h2>적 용 법 조</h2>
<p class="indent field">[적용 법조문을 기재하세요]</p>

<h2>증 거 자 료</h2>
<p class="indent">1. <span class="field">[증거명]</span></p>

<br/>
<p class="right">${today()}</p>
<p class="right">고발인 대리인: ${office}</p>
<p class="right">변호사 ${lawyer}</p>
`
}

/**
 * 변호인 의견서
 */
function defenseOpinion(caseData, profile) {
  const lawyer = profile?.lawyerName || '[변호사명]'
  const office = profile?.officeName || '[사무소명]'
  const client = caseData.clientName || '[피의자/피고인]'
  const criminal = caseData.criminalInfo || {}
  const caseNumber = caseData.caseNumber || criminal.policeCaseNumber || '[사건번호]'
  const charges = criminal.charges || '[죄명]'

  return `${STYLE}
<h1>변 호 인 의 견 서</h1>

<table>
  <tr><th width="15%">사건번호</th><td>${caseNumber}</td></tr>
  <tr><th>죄명</th><td>${charges}</td></tr>
  <tr><th>피의자</th><td>${client}</td></tr>
  <tr><th>변호인</th><td>변호사 ${lawyer} (${office})</td></tr>
</table>

<h2>1. 사건 개요</h2>
<p class="indent field">[사건 경위를 간략히 기재하세요]</p>

<h2>2. 변호인 의견</h2>

<h3>가. 사실관계에 대한 의견</h3>
<p class="indent field">[피의자 진술 및 사실관계에 대한 변호인 의견]</p>

<h3>나. 법률적 의견</h3>
<p class="indent field">[구성요건 해당성, 위법성, 책임 등에 대한 법률적 의견]</p>

<h3>다. 양형에 관한 의견</h3>
<p class="indent field">[양형 참작 사유: 초범, 반성, 피해 회복 등]</p>

<h2>3. 결론</h2>
<p class="indent field">[불기소 처분 / 선처 요청 등 결론을 기재하세요]</p>

<br/>
<p class="right">${today()}</p>
<p class="right">변호인 ${office}</p>
<p class="right">변호사 ${lawyer}</p>
`
}

/**
 * 보석허가청구서
 */
function bailRequest(caseData, profile) {
  const lawyer = profile?.lawyerName || '[변호사명]'
  const office = profile?.officeName || '[사무소명]'
  const client = caseData.clientName || '[피고인]'
  const court = caseData.court || '[관할법원]'
  const criminal = caseData.criminalInfo || {}
  const caseNumber = caseData.caseNumber || '[사건번호]'
  const charges = criminal.charges || '[죄명]'

  return `${STYLE}
<h1>보석허가청구서</h1>

<table>
  <tr><th width="15%">사건</th><td>${caseNumber} ${charges}</td></tr>
  <tr><th>피고인</th><td>${client}</td></tr>
  <tr><th>변호인</th><td>변호사 ${lawyer} (${office})</td></tr>
</table>

<p class="center"><b>${court} 귀중</b></p>

<h2>청 구 취 지</h2>
<p class="indent">피고인에 대한 보석을 허가하여 주시기 바랍니다.</p>

<h2>청 구 이 유</h2>

<h3>1. 구속의 부당성</h3>
<p class="indent field">[구속 사유가 소멸되었거나 부당한 이유를 기재하세요]</p>

<h3>2. 도주 우려 부존재</h3>
<p class="indent field">[주거 부정, 가족관계, 직업 등 도주 우려가 없는 사유]</p>

<h3>3. 증거인멸 우려 부존재</h3>
<p class="indent field">[수사 완료, 증거 확보 등 증거인멸 우려가 없는 사유]</p>

<h3>4. 보석 조건</h3>
<p class="indent field">[보증금 납입, 주거 제한 등 보석 조건 제안]</p>

<h2>소 명 자 료</h2>
<p class="indent">1. <span class="field">[소명자료명]</span></p>

<br/>
<p class="right">${today()}</p>
<p class="right">변호인 ${office}</p>
<p class="right">변호사 ${lawyer}</p>
`
}

/**
 * 항소장
 */
function appeal(caseData, profile) {
  const lawyer = profile?.lawyerName || '[변호사명]'
  const office = profile?.officeName || '[사무소명]'
  const client = caseData.clientName || '[피고인]'
  const court = caseData.court || '[관할법원]'
  const criminal = caseData.criminalInfo || {}
  const caseNumber = caseData.caseNumber || '[사건번호]'
  const charges = criminal.charges || '[죄명]'

  return `${STYLE}
<h1>항 소 장</h1>

<table>
  <tr><th width="15%">사건</th><td>${caseNumber} ${charges}</td></tr>
  <tr><th>피고인</th><td>${client}</td></tr>
  <tr><th>변호인</th><td>변호사 ${lawyer} (${office})</td></tr>
</table>

<p class="center"><b>${court} 귀중</b></p>

<h2>항 소 취 지</h2>
<p class="indent">원심판결을 파기하고, 피고인에게 무죄를 선고하여 주시기 바랍니다.</p>
<p class="indent"><span class="field">[또는 원하는 항소 취지를 기재하세요]</span></p>

<h2>항 소 이 유</h2>

<h3>1. 사실오인</h3>
<p class="indent field">[원심의 사실 인정이 잘못된 부분을 기재하세요]</p>

<h3>2. 법리오해</h3>
<p class="indent field">[원심의 법률 적용이 잘못된 부분을 기재하세요]</p>

<h3>3. 양형부당</h3>
<p class="indent field">[원심의 양형이 부당한 사유를 기재하세요]</p>

<p class="indent">항소이유서는 추후 별도 제출하겠습니다.</p>

<br/>
<p class="right">${today()}</p>
<p class="right">피고인 변호인</p>
<p class="right">${office}</p>
<p class="right">변호사 ${lawyer}</p>
`
}

const GENERATORS = {
  // 민사
  content_cert: contentCertification,
  complaint,
  answer,
  brief,
  settlement,
  // 형사
  criminal_complaint: criminalComplaint,
  criminal_accusation: criminalAccusation,
  defense_opinion: defenseOpinion,
  bail_request: bailRequest,
  appeal,
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
