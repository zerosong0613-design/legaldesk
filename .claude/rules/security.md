# 보안 규칙

## 절대 금지 사항

- API 키, Client ID, access token을 코드에 하드코딩 금지
- `console.log`에 token, 사건 내용, 의뢰인 정보 출력 금지
- Drive 스코프를 `drive` (전체 접근)로 확장 금지 — `drive.file`만 사용
- Gmail 스코프를 `gmail.modify`나 `gmail.send`로 확장 금지 — `gmail.readonly`만

## 토큰 관리

```javascript
// 토큰 저장: localStorage 사용 (sessionStorage는 탭 닫으면 사라짐)
localStorage.setItem('gd_access_token', token);
localStorage.setItem('gd_token_expiry', expiry);  // Unix timestamp

// 토큰 사용 전 만료 확인
function getValidToken() {
  const expiry = localStorage.getItem('gd_token_expiry');
  if (Date.now() > expiry - 60000) {  // 1분 여유
    return refreshToken();  // 자동 갱신
  }
  return localStorage.getItem('gd_access_token');
}
```

## 환경변수 관리

```bash
# .env.local (gitignore에 포함됨)
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIzaSy...

# .env.local은 절대 git commit 금지
# .gitignore에 .env.local 반드시 포함
```

## Vercel 배포 시

- Vercel 대시보드 환경변수에 `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY` 등록
- Google Cloud Console → OAuth 2.0 클라이언트 → 승인된 리다이렉션 URI에 Vercel URL 추가
- `http://localhost:5173`과 `https://legaldesk.vercel.app` 둘 다 등록

## 개인정보 처리 고려사항

- 의뢰인 정보(이름, 이메일, 전화번호)는 변호사 본인 Google Drive에만 저장
- 앱 서버에 어떤 의뢰인 데이터도 전송하지 않음
- 카카오톡 대화 내용은 Drive JSON에만 저장, 외부 AI API 전송 시 별도 동의 필요
- Phase 4에서 AI 요약 기능 추가 시 개인정보 처리 방침 수립 필수
