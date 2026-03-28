# LegalDesk

1인 변호사 사무실용 사건 관리 웹앱.
Google OAuth로 로그인하고, 사건 데이터를 본인 Google Drive에 JSON으로 저장한다.
별도 서버 없음. 외부 DB 없음. 데이터는 변호사 본인 Drive에만 있다.

## 상세 문서

- 전체 아키텍처 → @docs/architecture.md
- Google API 사용 패턴 → @.claude/rules/google-api.md
- 데이터 구조 및 Drive 저장 방식 → @.claude/rules/data-layer.md
- 보안 규칙 → @.claude/rules/security.md

## 기술 스택

- **프레임워크**: Vite + React 18
- **스타일**: Tailwind CSS v3
- **라우팅**: React Router v6
- **상태관리**: Zustand
- **인증**: Google OAuth 2.0 (PKCE, 서버리스)
- **배포**: Vercel (GitHub 연동 자동 배포)
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
src/
├── main.jsx
├── App.jsx
├── auth/
│   ├── GoogleAuth.jsx       # OAuth PKCE 처리
│   └── useAuth.js           # 인증 상태 훅
├── store/
│   ├── caseStore.js         # Zustand - 사건 목록
│   └── uiStore.js           # Zustand - UI 상태
├── api/
│   ├── drive.js             # Google Drive API 래퍼
│   ├── calendar.js          # Google Calendar API 래퍼
│   └── gmail.js             # Gmail API 래퍼
├── pages/
│   ├── Dashboard.jsx        # 사건 목록 대시보드
│   ├── CaseDetail.jsx       # 사건 상세 (탭 구조)
│   └── Settings.jsx         # 설정
├── components/
│   ├── case/
│   │   ├── CaseCard.jsx
│   │   ├── HearingList.jsx
│   │   ├── KakaoParser.jsx
│   │   ├── Timeline.jsx
│   │   ├── EmailList.jsx
│   │   └── DocumentList.jsx
│   └── ui/
│       ├── TabBar.jsx
│       ├── Badge.jsx
│       └── Modal.jsx
└── utils/
    ├── kakaoParser.js       # 카카오톡 txt 파서
    └── dateUtils.js
```

## 코딩 규칙

- 컴포넌트: 함수형 + hooks만 사용. 클래스 컴포넌트 금지
- 스타일: Tailwind 유틸리티 클래스만 사용. 인라인 style 객체 금지
- API 호출: 모두 `src/api/` 래퍼를 통해서만 호출. 컴포넌트에서 직접 fetch 금지
- 에러 처리: 모든 Google API 호출에 try/catch + 사용자 친화적 에러 메시지
- 환경변수: `.env.local`에 보관. 코드에 하드코딩 절대 금지

## 환경변수

```
VITE_GOOGLE_CLIENT_ID=        # Google Cloud Console에서 발급
VITE_GOOGLE_API_KEY=          # Google Cloud Console에서 발급
VITE_APP_URL=                 # 배포 URL (Vercel)
```

## 주의사항

- Google API 호출 시 access token 만료(1시간) 처리 필수 — 자동 갱신 로직 포함
- Drive 파일 쓰기는 `drive.file` 스코프로 제한 — 앱이 생성한 파일만 접근
- 카카오톡 파서는 iOS/Android 포맷 양쪽 지원 필수 — @utils/kakaoParser.js 참조
