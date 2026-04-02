# LegalDesk

1인 변호사 사무실용 사건 관리 웹앱.
Google OAuth로 로그인하고, 사건 데이터를 본인 Google Drive에 JSON으로 저장한다.
별도 서버 없음 (Vercel 서버리스 함수 제외). 외부 DB 없음. 데이터는 변호사 본인 Drive에만 있다.

## 상세 문서

- 전체 아키텍처 → @docs/architecture.md
- Google API 사용 패턴 → @.claude/rules/google-api.md
- 데이터 구조 및 Drive 저장 방식 → @.claude/rules/data-layer.md
- 보안 규칙 → @.claude/rules/security.md

## 기술 스택

- **프레임워크**: Vite + React 18
- **UI 라이브러리**: Mantine v7
- **라우팅**: React Router v6
- **상태관리**: Zustand
- **인증**: Google OAuth 2.0 (PKCE, 서버리스)
- **배포**: Vercel (GitHub 연동 자동 배포)
- **서버리스**: Vercel Functions (`/api/summarize.js`, `/api/transcribe.js`)
- **모바일**: PWA (vite-plugin-pwa)

## 주요 명령어

```bash
npm install          # 의존성 설치
npm run dev          # 개발 서버 (localhost:5173)
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 결과 미리보기
```

## 프로젝트 구조

```
├── api/                          # Vercel 서버리스 함수
│   ├── summarize.js              # AI 요약 (Claude API)
│   └── transcribe.js             # 음성 STT (Whisper API)
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── auth/
│   │   ├── GoogleAuth.jsx        # OAuth PKCE 처리
│   │   ├── AuthCallback.jsx      # OAuth 콜백
│   │   └── useAuth.js            # 인증 상태 훅
│   ├── store/
│   │   ├── caseStore.js          # Zustand - 사건/자문/프로필/템플릿/공유
│   │   ├── scheduleStore.js      # Zustand - 일정
│   │   └── uiStore.js            # Zustand - UI 상태
│   ├── api/
│   │   ├── drive.js              # Google Drive API 래퍼
│   │   ├── calendar.js           # Google Calendar API 래퍼
│   │   ├── gmail.js              # Gmail API 래퍼
│   │   └── ai.js                 # AI 요약/STT 클라이언트 래퍼
│   ├── hooks/
│   │   └── useSpeechToText.js    # Web Speech API 훅
│   ├── pages/
│   │   ├── Dashboard.jsx         # 대시보드 (브리핑, 기일, 공유 사건)
│   │   ├── Onboarding.jsx        # 첫 로그인 프로필 설정
│   │   ├── CaseList.jsx          # 민사 사건 목록
│   │   ├── CaseDetail.jsx        # 민사 사건 상세 (탭 구조)
│   │   ├── CriminalList.jsx      # 형사 사건 목록
│   │   ├── CriminalDetail.jsx    # 형사 사건 상세
│   │   ├── ConsultationList.jsx  # 자문 목록
│   │   ├── ConsultationDetail.jsx# 자문 상세
│   │   ├── SharedCaseDetail.jsx  # 공유받은 사건 상세
│   │   ├── TemplateManager.jsx   # 서면 템플릿 관리
│   │   ├── Billing.jsx           # 비용 관리
│   │   └── WorkspaceSettings.jsx # 워크스페이스 설정 + 프로필
│   ├── components/
│   │   ├── case/
│   │   │   ├── CaseCard.jsx
│   │   │   ├── SharedCaseCard.jsx    # 공유받은 사건 카드
│   │   │   ├── ShareCaseModal.jsx    # 사건별 공유 모달
│   │   │   ├── HearingList.jsx
│   │   │   ├── KakaoParser.jsx
│   │   │   ├── Timeline.jsx
│   │   │   ├── EmailList.jsx
│   │   │   ├── DocumentList.jsx      # 문서 + 서면 작성
│   │   │   ├── ConsultRecordTab.jsx  # 활동기록 탭 + AI 요약
│   │   │   ├── ConsultRecordForm.jsx # 활동기록 폼 + STT
│   │   │   ├── ConsultRecordCard.jsx
│   │   │   ├── ConsultRecordDetail.jsx
│   │   │   ├── ContactList.jsx
│   │   │   ├── CriminalCaseForm.jsx
│   │   │   ├── CriminalInfoSection.jsx
│   │   │   ├── CriminalStageBar.jsx
│   │   │   └── CaseBillingTab.jsx
│   │   └── ui/
│   │       ├── Layout.jsx
│   │       ├── Badge.jsx
│   │       └── Modal.jsx
│   └── utils/
│       ├── kakaoParser.js        # 카카오톡 txt 파서
│       ├── legalTemplates.js     # 서면 템플릿 (민사5/형사5/자문3)
│       ├── courtCaseParser.js    # 법원 사건 파서
│       └── dateUtils.js
```

## 주요 기능

### 사건 관리 (민사/형사/자문)
- 사건 CRUD + Google Drive JSON 저장
- 민사: 원고/피고 대리 구분
- 형사: 5단계 진행(경찰→검찰→기소→재판→판결), 구속 관리
- 자문: 계약검토, 법률의견서 등

### 활동기록 탭 (유형별 분기)
- **형사**: 상담, 경찰입회, 검찰입회, 접견, 기타활동
- **민사**: 상담, 상대방 협의, 기타활동
- **자문**: 상담, 기타활동

### 서면 템플릿 (13종 기본 제공 + 사용자 추가)
- **민사 5종**: 내용증명, 소장, 답변서, 준비서면, 화해권고서
- **형사 5종**: 고소장, 고발장, 변호인 의견서, 보석허가청구서, 항소장
- **자문 3종**: 법률의견서, 계약검토서, 회신서한
- 편집 방식: HTML 편집기 / Google Docs 편집 / 문서 파일 업로드
- 커스텀 템플릿 추가/삭제 가능

### 음성 입력 (STT)
- 🎤 실시간 마이크: Web Speech API (무료, Chrome)
- 📤 파일 업로드: Whisper API (`OPENAI_API_KEY` 필요)

### AI 요약
- 활동기록 AI 요약: Claude API (`ANTHROPIC_API_KEY` 필요)
- Vercel 서버리스 함수로 API 키 보호

### 사건별 개별 공유
- Google Drive 파일 권한 기반 (앱 필터링 아님)
- 사건 상세 → 공유 버튼 → 이메일+역할(읽기/편집) 설정
- 공유받은 사건은 대시보드 "공유받은 사건" 섹션에 표시

### 온보딩 + 프로필
- 첫 로그인 시 프로필 설정 (변호사명, 사무소명, 연락처, 등록번호)
- Drive `data/profile.json`에 저장 (기기 간 동기화)
- 워크스페이스 설정에서 수정 가능

## 코딩 규칙

- 컴포넌트: 함수형 + hooks만 사용. 클래스 컴포넌트 금지
- UI: Mantine 컴포넌트 사용. 인라인 style 객체는 최소화
- API 호출: 모두 `src/api/` 래퍼를 통해서만 호출. 컴포넌트에서 직접 fetch 금지
- 에러 처리: 모든 Google API 호출에 try/catch + 사용자 친화적 에러 메시지
- 환경변수: `.env.local`에 보관. 코드에 하드코딩 절대 금지

## 환경변수

```bash
# .env.local (프론트엔드 — 브라우저 노출)
VITE_GOOGLE_CLIENT_ID=        # Google Cloud Console에서 발급
VITE_GOOGLE_API_KEY=          # Google Cloud Console에서 발급
VITE_APP_URL=                 # 배포 URL (Vercel)

# Vercel 환경변수 (서버리스 전용 — 브라우저 미노출)
ANTHROPIC_API_KEY=            # AI 요약용 Claude API 키
OPENAI_API_KEY=               # 음성 STT용 Whisper API 키
```

## Drive 폴더 구조

```
LegalDesk/
├── data/
│   ├── cases.json            # 사건/자문 인덱스
│   ├── schedules.json        # 일정 인덱스
│   ├── profile.json          # 변호사 프로필
│   ├── templates.json        # 커스텀 서면 템플릿
│   ├── cases/{id}.json       # 사건 상세
│   └── consultations/{id}.json
├── files/{id}/               # 사건별 첨부 파일
└── templates/                # Google Docs 기반 서면 템플릿
```

## 주의사항

- Google API 호출 시 access token 만료(1시간) 처리 필수 — 자동 갱신 로직 포함
- Drive 스코프: `drive` (전체 접근) — 공유 기능에 필요
- 카카오톡 파서는 iOS/Android 포맷 양쪽 지원 필수 — @utils/kakaoParser.js 참조
- 서면 템플릿 플레이스홀더: [의뢰인], [상대방], [법원], [사건번호], [변호사명], [사무소명], [연락처], [날짜]
