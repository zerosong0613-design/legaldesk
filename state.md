# LegalDesk — 현재 진행 상태

## 마지막 업데이트: 2026-03-28

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

---

## 미완료 — 다음 작업

### Step 9. 자문 상세 페이지
**브랜치**: `feat/consultation-detail`
- ConsultationDetail 페이지 (4탭: 타임라인, 카톡, 문서, 정보)
- 마감일 관리 (Calendar 연동)
- 자문 정보 편집
- 기존 Timeline, KakaoParser 재사용

### Step 10. 최근 활동 + 통합 검색
**브랜치**: `feat/activity-search`
- 대시보드 "최근 활동" 섹션
- 사건 + 자문 통합 검색
- 검색 결과에서 상세 페이지 이동

### Phase 2 — 연동
- [ ] Gmail 스레드 연동 (의뢰인 이메일로 스레드 조회)
- [ ] Drive 문서 탭 (사건별 첨부 파일 목록)
- [ ] 비용 관리 (별도 메뉴, 세금계산서/입금 연동은 추후)

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
│   ├── drive.js                     # Drive API (폴더/파일 CRUD, v2 구조)
│   └── calendar.js                  # Calendar API (CRUD + 전체 캘린더 검색)
├── pages/
│   ├── Dashboard.jsx                # 통계 + 캘린더 + 일정 + 사건/자문 목록
│   └── CaseDetail.jsx               # 사건 상세 (5탭)
├── components/
│   ├── case/
│   │   ├── CaseCard.jsx             # 사건 카드
│   │   ├── CaseForm.jsx             # 사건 폼 (법원 자동 파싱 포함)
│   │   ├── ConsultationCard.jsx     # 자문 카드
│   │   ├── ConsultationForm.jsx     # 자문 폼
│   │   ├── HearingList.jsx          # 기일 목록 + 캘린더 가져오기
│   │   ├── KakaoParser.jsx          # 카카오톡 붙여넣기/업로드
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
