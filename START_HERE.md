# LegalDesk — Claude Code 시작 가이드

## 이 폴더 구조를 그대로 프로젝트 루트에 넣으면 됩니다

```
your-project/
├── CLAUDE.md                        ← Claude Code가 자동으로 읽음
├── docs/
│   └── architecture.md              ← 전체 설계 (CLAUDE.md에서 @import)
└── .claude/
    └── rules/
        ├── google-api.md            ← Google API 패턴
        ├── data-layer.md            ← 데이터 구조
        └── security.md             ← 보안 규칙
```

---

## 시작하는 방법

### 1단계 — 프로젝트 초기화

터미널에서:
```bash
# 새 Vite + React 프로젝트 생성
npm create vite@latest legaldesk -- --template react
cd legaldesk

# 이 폴더의 CLAUDE.md, docs/, .claude/ 를 복사

# 의존성 설치
npm install
npm install react-router-dom zustand tailwindcss @tailwindcss/vite
npm install vite-plugin-pwa
```

### 2단계 — Google Cloud Console 설정

1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성: "LegalDesk"
3. API 라이브러리에서 활성화:
   - Google Drive API
   - Google Calendar API
   - Gmail API
4. OAuth 2.0 클라이언트 ID 생성 (웹 애플리케이션)
   - 승인된 자바스크립트 원본: `http://localhost:5173`
   - 승인된 리다이렉션 URI: `http://localhost:5173/auth/callback`
5. `.env.local` 생성:
   ```
   VITE_GOOGLE_CLIENT_ID=발급받은_클라이언트_ID
   VITE_GOOGLE_API_KEY=발급받은_API_키
   ```

### 3단계 — Claude Code 실행

```bash
# 프로젝트 루트에서
claude

# Claude Code가 CLAUDE.md를 읽고 프로젝트 컨텍스트 파악
# 첫 번째 지시:
```

**Claude Code에 처음 입력할 내용:**
```
Phase 1부터 시작합니다.
먼저 Google OAuth PKCE 로그인 기능을 구현해주세요.
src/auth/GoogleAuth.jsx와 src/auth/useAuth.js를 만들어주세요.
```

---

## Phase 1 순서 (권장)

Claude Code 세션 하나에 태스크 하나씩:

```bash
# 세션 1 - 인증
"Google OAuth PKCE 로그인 구현. src/auth/ 폴더 생성"

# 세션 2 - 데이터 레이어
"Drive API 래퍼 구현. src/api/drive.js — cases.json 읽기/쓰기"

# 세션 3 - 사건 CRUD
"사건 생성/수정/삭제 기능. caseStore와 Dashboard 페이지"

# 세션 4 - 기일 관리
"기일 추가 기능. Calendar API 연동. HearingList 컴포넌트"

# 세션 5 - 카카오톡 파서
"kakaoParser.js 구현. iOS/Android 포맷 양쪽 지원. KakaoParser 컴포넌트"

# 세션 6 - 타임라인
"Timeline 컴포넌트. 카톡+메모+기일 통합 시간순 표시"
```

---

## Claude Code 팁 (희성님 기존 경험 기반)

- **계획 먼저**: `Shift+Tab` 두 번 → Plan Mode. 코딩 전 계획 확인
- **컨텍스트 관리**: 세션이 길어지면 `/compact` 실행
- **태스크 분리**: 세션 하나에 기능 하나. 여러 기능 동시 요청 금지
- **검증 요청**: 구현 후 "이 코드에서 엣지 케이스 찾아줘" 추가 검토
- **브랜치 전략**: 기능별 브랜치 → PR → main 병합

---

## GitHub + Vercel 연동

```bash
# GitHub 레포 생성 후
git init
git add .
git commit -m "init: LegalDesk 프로젝트 초기화"
git remote add origin https://github.com/zerosong0613-design/legaldesk
git push -u origin main
```

Vercel:
1. vercel.com → Import Git Repository
2. 환경변수 입력 (VITE_GOOGLE_CLIENT_ID 등)
3. 배포 완료 후 Vercel URL을 Google Cloud Console 리다이렉션 URI에 추가
