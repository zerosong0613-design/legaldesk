# LegalDesk — Phase 1 구현 계획

## 현재 상태

- 문서만 존재 (CLAUDE.md, architecture.md, rules)
- 코드 없음, Vite 프로젝트 미초기화
- Git 미초기화

---

## 사전 준비 (Step 0)

### 0-1. Vite + React 프로젝트 초기화
```bash
npm create vite@latest . -- --template react
npm install
npm install react-router-dom zustand tailwindcss @tailwindcss/vite
npm install vite-plugin-pwa
```

### 0-2. Git + GitHub 연동
```bash
git init
# .gitignore에 .env.local 포함 확인
git add .
git commit -m "init: LegalDesk 프로젝트 초기화"
git remote add origin https://github.com/zerosong0613-design/legaldesk
git push -u origin main
```

### 0-3. Tailwind CSS 설정
- `vite.config.js`에 `@tailwindcss/vite` 플러그인 추가
- `src/index.css`에 `@import "tailwindcss"` 추가

### 0-4. Google Cloud Console 설정 (수동)
- 프로젝트 생성, API 활성화 (Drive, Calendar, Gmail)
- OAuth 2.0 클라이언트 ID 발급
- `.env.local` 생성

---

## Phase 1 — MVP (6단계)

### Step 1. Google OAuth PKCE 로그인
**브랜치**: `feat/auth`
**파일**:
- `src/auth/GoogleAuth.jsx` — 로그인 버튼 + OAuth 리다이렉트 처리
- `src/auth/useAuth.js` — 인증 상태 관리 훅 (토큰 저장/갱신/만료 확인)
- `src/App.jsx` — 라우팅 설정 + 인증 가드

**구현 내용**:
1. PKCE code_verifier/code_challenge 생성
2. Google OAuth 인증 URL 리다이렉트
3. 콜백에서 authorization code → access_token 교환
4. localStorage에 토큰 저장 + 만료 시간 관리
5. 토큰 자동 갱신 로직
6. 로그인/로그아웃 UI

**스코프**:
```
drive.file, calendar.events, gmail.readonly
```

**완료 기준**: 로그인 → 토큰 획득 → 로그아웃 플로우 동작

---

### Step 2. Drive API 래퍼 + 데이터 레이어
**브랜치**: `feat/drive-api`
**파일**:
- `src/api/drive.js` — Drive API CRUD 래퍼
- `src/store/caseStore.js` — Zustand 사건 스토어
- `src/store/uiStore.js` — Zustand UI 상태 스토어

**구현 내용**:
1. 앱 루트 폴더 (`LegalDesk/`) 생성/탐색
2. `cases.json` 읽기/쓰기
3. `cases/{id}.json` 읽기/쓰기
4. 폴더 구조 자동 생성 (최초 실행 시)
5. Zustand 스토어: cases 배열, currentCase, CRUD 액션
6. Drive 저장 실패 시 롤백 처리

**완료 기준**: Drive에 JSON 파일 생성/읽기/수정 동작 확인

---

### Step 3. 사건 CRUD + 대시보드
**브랜치**: `feat/case-crud`
**파일**:
- `src/pages/Dashboard.jsx` — 사건 목록 (카드 그리드)
- `src/components/case/CaseCard.jsx` — 사건 카드 컴포넌트
- `src/components/ui/Badge.jsx` — 상태 배지
- `src/components/ui/Modal.jsx` — 모달 (사건 생성/수정)

**구현 내용**:
1. 사건 생성 폼 (사건번호, 의뢰인, 유형, 법원 등)
2. 사건 목록 카드 표시
3. 상태 필터 (접수/진행/종결/보류)
4. 사건 검색 (의뢰인명, 사건번호)
5. 사건 수정/삭제
6. D-7 이내 기일 알림 배너

**완료 기준**: 사건 생성 → 목록 표시 → 수정/삭제 → Drive 동기화

---

### Step 4. 사건 상세 페이지 + 기일 관리
**브랜치**: `feat/case-detail`
**파일**:
- `src/pages/CaseDetail.jsx` — 탭 구조 상세 페이지
- `src/components/ui/TabBar.jsx` — 탭 바
- `src/components/case/HearingList.jsx` — 기일 목록 + 추가 폼
- `src/api/calendar.js` — Calendar API 래퍼

**구현 내용**:
1. 사건 상세 페이지 5개 탭 레이아웃
2. 기일 추가 폼 (날짜, 유형, 법원, 법정)
3. Calendar API 이벤트 생성 (리마인더 포함: D-7, D-1, 당일)
4. 기일 수정/삭제 (Calendar 연동)
5. 기일 목록 표시 (다가오는 순)

**완료 기준**: 기일 추가 → Calendar 이벤트 생성 → 목록 표시

---

### Step 5. 카카오톡 파서
**브랜치**: `feat/kakao-parser`
**파일**:
- `src/utils/kakaoParser.js` — 카카오톡 txt 파서
- `src/components/case/KakaoParser.jsx` — 붙여넣기/파일 업로드 UI
- `src/utils/dateUtils.js` — 날짜 유틸리티

**구현 내용**:
1. iOS 포맷 파싱 (`2026년 3월 1일 오후 2:23, 홍길동 : ...`)
2. Android 포맷 파싱 (`2026-03-01 14:23, 홍길동 : ...`)
3. 날짜 구분선 처리
4. 멀티라인 메시지 합산
5. 첨부 파일 태깅 (사진/동영상/파일/이모티콘)
6. 붙여넣기 + txt 파일 업로드 UI
7. 파싱 실패 시 원본 텍스트를 메모로 저장 (데이터 유실 방지)

**완료 기준**: iOS/Android 카카오톡 txt → 파싱 → Drive 저장

---

### Step 6. 타임라인 + 메모
**브랜치**: `feat/timeline`
**파일**:
- `src/components/case/Timeline.jsx` — 통합 타임라인
- 메모 추가 기능 (CaseDetail 내)

**구현 내용**:
1. 카톡 메시지 + 메모 + 기일을 시간순 통합 표시
2. 메모 추가/수정/삭제
3. 항목 유형별 아이콘/색상 구분
4. 날짜별 그룹핑

**완료 기준**: 타임라인에 모든 유형의 항목이 시간순으로 표시

---

## 브랜치 전략

```
main
 ├── feat/auth          → PR #1
 ├── feat/drive-api     → PR #2
 ├── feat/case-crud     → PR #3
 ├── feat/case-detail   → PR #4
 ├── feat/kakao-parser  → PR #5
 └── feat/timeline      → PR #6
```

각 단계 완료 후 PR → main 머지 → 다음 단계 진행

---

## Phase 1 완료 후 상태

- Google OAuth 로그인 동작
- 사건 CRUD + Drive 저장
- 기일 관리 + Calendar 연동
- 카카오톡 대화 파싱 + 저장
- 통합 타임라인 표시
- 대시보드 (필터, 검색, 알림)
