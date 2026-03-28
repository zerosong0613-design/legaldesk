# LegalDesk — 전체 아키텍처

## 서비스 개요

**목적**: 1인 변호사 사무실의 사건 관리 도구  
**타겟**: 월 10~20건 처리하는 1인 변호사  
**핵심 원칙**: 의뢰인은 아무것도 바꾸지 않는다. 변호사가 이미 쓰는 Google 도구 위에 올라탄다.

## 아키텍처 다이어그램

```
[브라우저 / PWA]
      │
      ├── Google OAuth 2.0 (PKCE)
      │         └── 인증 토큰 → localStorage
      │
      ├── Google Drive API
      │         ├── cases.json (사건 목록)
      │         └── cases/{id}.json (사건 상세)
      │
      ├── Google Calendar API
      │         └── 기일 이벤트 CRUD
      │
      └── Gmail API (read-only)
                └── 의뢰인 이메일 스레드 조회
```

서버 없음. 모든 데이터는 변호사 본인 Google Drive에 저장.

## Google OAuth 2.0 PKCE 플로우

```
1. 앱 로드 → PKCE code_verifier 생성 → sessionStorage 저장
2. Google 로그인 버튼 → accounts.google.com 리다이렉트
3. 사용자 동의 → ?code=... 로 콜백
4. code + code_verifier → access_token + refresh_token 교환
5. token → localStorage 저장
6. 이후 모든 API 호출에 Authorization: Bearer {token}
```

**필요한 OAuth 스코프**
```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/gmail.readonly
```

## 페이지 구조

### 대시보드 (`/`)
- 진행 중인 사건 카드 목록
- 상태 필터: 접수 / 진행 / 종결 / 보류
- D-7 이내 기일 알림 배너
- 사건 검색 (의뢰인명, 사건번호, 키워드)

### 사건 상세 (`/case/:id`)
5개 탭:
- **타임라인**: 카톡 + 이메일 + 메모 + 기일 통합 시간순
- **기일**: Calendar 연동 기일 목록 + 추가
- **카카오톡**: 붙여넣기 + txt 업로드 + 파싱
- **이메일**: Gmail 스레드 연동
- **문서**: Drive 폴더 파일 목록

### 설정 (`/settings`)
- Google 계정 연결 상태
- Drive 폴더 경로 확인
- 로그아웃

## 사건 카드 표시 정보

```
[사건번호] 의뢰인명                    [상태 배지]
사건 유형 | 법원                       
다음 기일: 2026.04.15 (D-18)          [미확인 알림 수]
최근: "변호사님, 서류 준비했습니다" (카톡, 3일 전)
```

## PWA 설정

- `manifest.json`: 앱 이름, 아이콘, 테마 색상
- `service-worker.js`: 오프라인 캐시 (마지막 조회 사건 데이터)
- iOS 홈 화면 추가 지원 (`apple-mobile-web-app-capable`)
- 모바일 하단 탭바: 사건목록 / 캘린더 / 검색 / 설정

## 개발 단계 (Phase)

### Phase 1 — MVP (4주)
- [ ] Google OAuth 로그인
- [ ] 사건 CRUD (Drive JSON)
- [ ] 기일 관리 + Calendar 연동
- [ ] 카카오톡 파서 + 타임라인
- [ ] 대시보드

### Phase 2 — 연동 (2주)
- [ ] Gmail 스레드 연동
- [ ] Drive 문서 탭
- [ ] D-day 알림 배너

### Phase 3 — 모바일 (1주)
- [ ] PWA 빌드
- [ ] 모바일 반응형 레이아웃
- [ ] 오프라인 캐시

### Phase 4 — 고도화 (선택)
- [ ] AI 메모 요약 (Azure OpenAI)
- [ ] 수임료 관리
- [ ] 사건 보고서 생성
