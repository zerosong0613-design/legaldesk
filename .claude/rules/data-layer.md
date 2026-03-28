# 데이터 구조 및 Drive 저장 방식

## cases.json — 사건 목록 인덱스

```json
{
  "version": "1.0",
  "updatedAt": "2026-03-28T09:00:00Z",
  "cases": [
    {
      "id": "2026-001",
      "caseNumber": "2026가합12345",
      "clientName": "홍길동",
      "clientEmail": "client@example.com",
      "clientPhone": "010-1234-5678",
      "type": "민사",
      "status": "진행",
      "court": "서울중앙지방법원",
      "openedAt": "2026-01-15",
      "closedAt": null,
      "driveFolderId": "1abc...",
      "driveFileId": "1def...",
      "tags": ["손해배상", "계약"],
      "nextHearingDate": "2026-04-15T10:00:00",
      "lastActivityAt": "2026-03-28T14:23:00"
    }
  ]
}
```

**status 값**: `"접수"` | `"진행"` | `"종결"` | `"보류"`  
**type 값**: `"형사"` | `"민사"` | `"가사"` | `"행정"` | `"기타"`

## cases/{id}.json — 사건 상세

```json
{
  "id": "2026-001",
  "hearings": [
    {
      "id": "h-uuid",
      "datetime": "2026-04-15T10:00:00",
      "type": "변론",
      "court": "서울중앙지방법원",
      "room": "305호",
      "calendarEventId": "google_calendar_event_id",
      "note": "",
      "createdAt": "2026-03-01T09:00:00"
    }
  ],
  "kakaoMessages": [
    {
      "id": "k-uuid",
      "datetime": "2026-03-01T14:23:00",
      "sender": "홍길동",
      "message": "변호사님 서류 준비했습니다",
      "isFromClient": true,
      "source": "paste",
      "importedAt": "2026-03-02T09:00:00"
    }
  ],
  "memos": [
    {
      "id": "m-uuid",
      "datetime": "2026-03-05T09:00:00",
      "content": "의뢰인 면담 완료. 추가 증거 확보 필요.",
      "createdAt": "2026-03-05T09:00:00"
    }
  ],
  "emailThreadIds": ["thread_id_1", "thread_id_2"]
}
```

## 카카오톡 파서 (`src/utils/kakaoParser.js`)

### 지원 포맷

**iOS 포맷**
```
2026년 3월 1일 오후 2:23, 홍길동 : 변호사님 서류 준비했습니다
```

**Android 포맷**
```
2026-03-01 14:23, 홍길동 : 변호사님 서류 준비했습니다
```

**날짜 구분선 (공통)**
```
--------------- 2026년 3월 1일 토요일 ---------------
```

### 파서 규칙
- 날짜 구분선 감지 후 이후 메시지에 해당 날짜 적용
- 멀티라인 메시지: 다음 `발신자 :` 패턴이 나올 때까지 한 메시지로 합산
- "사진", "동영상", "파일", "이모티콘" 언급은 `hasAttachment: true` 태깅
- 파서 실패 시 원본 텍스트를 단일 메모로 저장 (데이터 유실 금지)

## Zustand 스토어

### caseStore (`src/store/caseStore.js`)
```javascript
{
  cases: [],           // cases.json에서 로드
  currentCase: null,   // 현재 열린 사건 상세
  driveRootId: null,   // LegalDesk 루트 폴더 ID
  casesFileId: null,   // cases.json 파일 ID
  
  // 액션
  loadCases: async () => {},
  createCase: async (data) => {},
  updateCase: async (id, data) => {},
  loadCaseDetail: async (id) => {},
  addHearing: async (caseId, hearing) => {},
  addKakaoMessages: async (caseId, messages) => {},
  addMemo: async (caseId, memo) => {}
}
```

### 저장 원칙
- cases.json 수정 시: 항상 전체 파일 교체 (PATCH 없음)
- 사건 상세 수정 시: 해당 `cases/{id}.json`만 교체
- Drive 저장 실패 시: 스토어 상태 롤백 + 에러 토스트
