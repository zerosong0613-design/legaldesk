# Google API 사용 패턴

## 공통 원칙

- 모든 API 호출은 `src/api/` 래퍼 함수를 통해서만 한다
- 컴포넌트에서 직접 `fetch('https://www.googleapis.com/...')` 금지
- access_token 만료(1시간) 시 자동 갱신 처리 필수

## Drive API (`src/api/drive.js`)

### 파일 구조
```
LegalDesk/               ← 앱 루트 폴더 (최초 1회 생성)
├── data/
│   ├── cases.json       ← 사건 목록 인덱스
│   └── cases/
│       ├── 2026-001.json
│       └── 2026-002.json
└── files/
    └── 2026-001/        ← 사건별 첨부 파일
```

### 핵심 함수 패턴
```javascript
// 파일 읽기
async function readJsonFile(fileId) {
  const res = await gapi.client.drive.files.get({
    fileId,
    alt: 'media'
  });
  return JSON.parse(res.body);
}

// 파일 쓰기 (생성 또는 업데이트)
async function writeJsonFile(fileId, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  // multipart upload
}

// 폴더 생성
async function createFolder(name, parentId) {
  return gapi.client.drive.files.create({
    resource: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    }
  });
}
```

### 주의사항
- `drive.file` 스코프: **앱이 직접 생성한 파일만** 접근 가능. 기존 Drive 파일 접근 불가
- 파일 ID는 `caseStore`에 캐시해서 매번 검색 쿼리 날리지 않기
- cases.json 동시 수정 방지: 쓰기 전 항상 최신 버전 읽고 머지

## Calendar API (`src/api/calendar.js`)

### 기일 생성 패턴
```javascript
async function createHearing(hearing) {
  return gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource: {
      summary: `[${hearing.caseNumber}] ${hearing.clientName} — ${hearing.type}`,
      description: `법원: ${hearing.court}\n법정: ${hearing.room}`,
      start: { dateTime: hearing.datetime },
      end: { dateTime: addHours(hearing.datetime, 1) },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 * 24 * 7 },  // D-7
          { method: 'popup', minutes: 60 * 24 },       // D-1
          { method: 'popup', minutes: 60 * 9 }         // 당일 오전
        ]
      }
    }
  });
}
```

### 주의사항
- 기일 삭제 시 Calendar 이벤트도 함께 삭제
- `calendarEventId`를 사건 JSON에 저장해서 이후 수정/삭제에 사용

## Gmail API (`src/api/gmail.js`)

### 스레드 조회 패턴
```javascript
// 의뢰인 이메일로 스레드 검색
async function getThreadsByEmail(email) {
  const res = await gapi.client.gmail.users.threads.list({
    userId: 'me',
    q: `from:${email} OR to:${email}`
  });
  return res.result.threads || [];
}

// 스레드 상세
async function getThread(threadId) {
  return gapi.client.gmail.users.threads.get({
    userId: 'me',
    id: threadId,
    format: 'metadata',
    metadataHeaders: ['From', 'To', 'Subject', 'Date']
  });
}
```

### 주의사항
- Gmail은 **읽기 전용**. 이메일 발송은 Gmail 앱으로 위임
- 이메일 본문은 인앱 저장 없음. 항상 Gmail API에서 실시간 조회
- 스레드 ID만 사건 JSON에 저장
