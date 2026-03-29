# LegalDesk — 현재 진행 상태

## 마지막 업데이트: 2026-03-29

## 배포 정보
- **URL**: https://legaldesk-one.vercel.app
- **GitHub**: https://github.com/zerosong0613-design/legaldesk
- **배포 방식**: GitHub push → Vercel 자동 배포
- **현재 브랜치**: main

## Vercel 환경변수
- `VITE_GOOGLE_CLIENT_ID` — 설정 완료
- `VITE_GOOGLE_CLIENT_SECRET` — 설정 완료

## Google Cloud Console
- OAuth 2.0 클라이언트: 웹 애플리케이션
- 승인된 리다이렉션 URI: `https://legaldesk-one.vercel.app/auth/callback`, `http://localhost:5173/auth/callback`
- 활성화된 API: Drive, Calendar, Gmail
- OAuth 스코프: `drive.file`, `calendar.readonly`, `calendar.events`, `gmail.readonly`
- 동의 화면: 테스트 모드 (테스트 사용자 수동 추가 필요)

---

## 완료된 기능

### Phase 1 — MVP ✅
- [x] **Step 1**: Google OAuth PKCE 로그인 (계정 선택 + client_secret 포함)
- [x] **Step 2**: Drive API 래퍼 + Zustand 스토어 (폴더 자동 생성)
- [x] **Step 3**: 사건 CRUD + 대시보드 (카드, 필터, 검색)
- [x] **Step 4**: 사건 상세 5탭 + 기일/Calendar 연동 (리마인더 D-7, D-1, 당일)
- [x] **Step 5**: 카카오톡 파서 (iOS/Android) + txt 업로드
- [x] **Step 6**: 통합 타임라인 + 메모 추가/삭제

### Phase 1.5 — 구조 개편 ✅
- [x] **Step 7**: 사건/자문 2파트 분리 + 데이터 v2 마이그레이션
- [x] **Step 7**: 법원 사건검색 결과 붙여넣기 자동 파싱 (courtCaseParser)
- [x] **Step 8**: 대시보드 리디자인 (통계 카드 4개 + 사건/자문 탭)
- [x] 캘린더 기일 가져오기 (엘박스 연동, 모든 캘린더 검색, 사건번호 매칭)
- [x] 대시보드 미니 캘린더 + 전체 일정 패널
- [x] Vercel SPA 라우팅 (vercel.json)
- [x] LegalDesk 로고 클릭 → 홈 이동

### Phase 1.7 — UI 개편 + 자문 상세 ✅
- [x] Tailwind → Mantine UI v8 전환 (Dark Command 디자인)
- [x] 카카오톡 말풍선 뷰 (좌/우 정렬, 배치별 삭제, 내 이름 선택)
- [x] 타임라인 카드 리디자인 (캘린더 제목 파싱, 요일 표시)
- [x] 기일 카드 개선 (액센트 바, D-day, 위치 아이콘)
- [x] **Step 9**: ConsultationDetail 페이지 (4탭: 타임라인, 카톡, 문서, 정보)
  - `/consultation/:id` 라우트 + 대시보드 네비게이션 분리
  - 마감일 관리 (Calendar 연동) + DeadlineCard 컴포넌트
  - 자문 정보 표시/편집 (ConsultationForm 재사용)
  - 기존 Timeline, KakaoParser 재사용
- [x] **Step 10**: 최근 활동 + 통합 검색
  - 대시보드 "최근 활동" 섹션 (사건+자문 통합, 최신 5개)
  - 통합 검색 (사건+자문 동시 검색, 타입 뱃지 표시)
  - 검색 결과에서 올바른 상세 페이지로 이동

---

### Phase 2 — 연동 ✅
- [x] Gmail 스레드 연동 (`src/api/gmail.js` + `EmailList.jsx`)
  - 의뢰인 이메일로 자동 검색, 스레드 목록 표시
  - 확장하면 본문 미리보기, Gmail 링크로 열기
  - CaseDetail 이메일 탭 Card import 누락 버그 수정
- [x] Drive 문서 �� (`DocumentList.jsx`)
  - 사건/자문별 파일 목록 (아이콘 + 크기 + 날짜)
  - 파일 업로드 (다중 선택), 삭제, Drive에서 열기
  - `drive.js`에 `listFilesInFolder`, `uploadFileToDrive` 추가
- [x] 비용 관리 (`src/pages/Billing.jsx` — `/billing` 라우트)
  - 수임료/실비/입금/환불 CRUD
  - 사건+자문 통합 연결 (searchable Select)
  - 통계 카드 (수임료 총액, 입금 총액, 실비 총액, 잔액)
  - 테이블 뷰 + 유형 필터 + 검색
  - 대시���드 헤더에 "비용관리" 바로가기 추가
  - 데이터는 `cases.json`의 `billings` 배열에 저장

### Phase 2.5 — 협업 ✅
- [x] 작업공간 공유 기능 (`src/pages/WorkspaceSettings.jsx`)
  - OAuth 스코프 `drive.file` → `drive` 변경 (공유 폴더 접근)
  - 내 작업공간 / 공유 작업공간 전환
  - Google 이메일로 직원 초대 (Drive 폴더 공유)
  - 공유된 LegalDesk 폴더 자동 검색 + 연결
  - 권한 목록 조회 (소유자/편집자/뷰어)
  - `caseStore`에 workspace 개념 추가 (localStorage 저장)
  - 대시보드 헤더에 작업공간 표시 + 전환 버튼

---

## 미완료 — 다음 작업

### Phase 3 — 모바일
- [ ] PWA 빌드 (vite-plugin-pwa, Vite 호환 버전 필요)
- [ ] 모바일 반응형 레이아웃
- [ ] 오프라인 캐시

---

## 파일 구조 (현재)

```
src/
├── main.jsx
├── App.jsx                          # 라우팅 + 인증 가드 + Drive 초기화
├── auth/
│   ├── GoogleAuth.jsx               # 로그인 페이지
│   ├── AuthCallback.jsx             # OAuth 콜백 처리
│   └── useAuth.js                   # PKCE 인증 + 토큰 관리
├── store/
│   ├── caseStore.js                 # 사건 + 자문 CRUD + 기일/카톡/메모
│   └── uiStore.js                   # 필터, 검색, 모달, 토스트, 대시보드탭
├── api/
│   ├── drive.js                     # Drive API (폴더/파일 CRUD, 문서 업로드/목록)
│   ├── calendar.js                  # Calendar API (CRUD + 전체 캘린더 검색)
│   └── gmail.js                     # Gmail API (스레드 검색/조회, read-only)
├── pages/
│   ├── Dashboard.jsx                # 통계 + 캘린더 + 일정 + 최근활동 + 통합검색
│   ├── CaseDetail.jsx               # 사건 상세 (5탭: 타임라인, 기일, 카톡, 이메일, 문서)
│   ├── ConsultationDetail.jsx       # 자문 상세 (4탭: 타임라인, 카톡, 문서, 정보)
│   ├── Billing.jsx                  # 비용 관리 (수임료/실비/입금/환불)
│   └── WorkspaceSettings.jsx       # 작업공간 설정 (공유/초대/전환)
├── components/
│   ├── case/
│   │   ├── CaseCard.jsx             # 사건 카드
│   │   ├── CaseForm.jsx             # 사건 폼 (법원 자동 파싱 포함)
│   │   ├── ConsultationCard.jsx     # 자문 카드
│   │   ├── ConsultationForm.jsx     # 자문 폼
│   │   ├── HearingList.jsx          # 기일 목록 + 캘린더 가져오기
│   │   ├── KakaoParser.jsx          # 카카오톡 붙여넣기/업로드
│   │   ├── EmailList.jsx           # Gmail 스레드 연동
│   │   ├── DocumentList.jsx        # Drive 파일 관리
│   │   └── Timeline.jsx             # 통합 타임라인
│   └── ui/
│       ├── Badge.jsx                # 상태 배지
│       ├── Modal.jsx                # 모달
│       ├── TabBar.jsx               # 탭 네비게이션
│       ├── MiniCalendar.jsx         # 미니 캘린더
│       └── Toast.jsx                # 토스트 알림
└── utils/
    ├── kakaoParser.js               # 카카오톡 txt 파서
    ├── courtCaseParser.js           # 법원 사건검색 결과 파서
    └── dateUtils.js                 # 날짜 유틸리티
```

## 데이터 구조 (Drive, v2)

```
LegalDesk/
├── data/
│   ├── cases.json          # { version: "2.0", cases: [...], consultations: [...] }
│   ├── cases/
│   │   └── {id}.json       # 사건 상세 (hearings, kakaoMessages, memos)
│   └── consultations/
│       └── {id}.json       # 자문 상세 (kakaoMessages, memos)
└── files/
    └── {id}/               # 사건/자문별 첨부 파일
```

## 참고사항
- 엘박스 캘린더 이벤트 형태: `[에스케이] 변론 | 수원지방법원-2024나91606 | 법정동 제206호 법정 16:30`
- 법원 사건번호 패턴: `\d{4}[가-힣]{1,3}\d+` (예: 2024나91606, 2023가합102415)
- 비용 관리는 별도 메뉴로 분리 예정 (세금계산서, 입금 연동은 Phase 2+)
