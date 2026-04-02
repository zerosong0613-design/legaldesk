import { useState } from 'react'
import {
  TextInput, Textarea, Button, Group, Stack, Text,
  UnstyledButton, Box, Switch, Divider,
} from '@mantine/core'

const CRIMINAL_ACTIVITY_TYPES = [
  { value: 'consult', label: '상담', icon: '💬' },
  { value: 'police_attend', label: '경찰입회', icon: '🚔' },
  { value: 'prosecution_attend', label: '검찰입회', icon: '⚖️' },
  { value: 'visit', label: '접견', icon: '🏛️' },
  { value: 'other_activity', label: '기타활동', icon: '📋' },
]

const CIVIL_ACTIVITY_TYPES = [
  { value: 'consult', label: '상담', icon: '💬' },
  { value: 'negotiation', label: '상대방 협의', icon: '🤝' },
  { value: 'other_activity', label: '기타활동', icon: '📋' },
]

const METHODS = [
  { value: 'visit', label: '방문', icon: '🏢' },
  { value: 'call', label: '전화', icon: '📞' },
  { value: 'video', label: '화상', icon: '🎥' },
  { value: 'kakao', label: '카톡', icon: '💛' },
  { value: 'other', label: '기타', icon: '💬' },
]

const STATUSES = [
  { value: 'reviewing', label: '검토중', color: 'var(--mantine-color-yellow-6)' },
  { value: 'done', label: '완료', color: 'var(--mantine-color-green-6)' },
  { value: 'followup', label: '후속필요', color: 'var(--mantine-color-red-6)' },
]

function getTodayDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCurrentTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function ConsultRecordForm({ initialData, onSubmit, onCancel, caseType }) {
  const isEditing = !!initialData
  const isCriminal = caseType === '형사'
  const activityTypes = isCriminal ? CRIMINAL_ACTIVITY_TYPES : CIVIL_ACTIVITY_TYPES

  const [form, setForm] = useState({
    activityType: initialData?.activityType || 'consult',
    date: initialData?.date || getTodayDate(),
    time: initialData?.time || getCurrentTime(),
    method: initialData?.method || 'call',
    content: initialData?.content || '',
    clientRequest: initialData?.clientRequest || '',
    status: initialData?.status || 'reviewing',
    // 수사입회 전용
    location: initialData?.location || '',
    investigatorName: initialData?.investigatorName || '',
    suspectStatement: initialData?.suspectStatement || '',
    investigatorQuestions: initialData?.investigatorQuestions || '',
    evidenceSubmitted: initialData?.evidenceSubmitted || false,
    evidenceDetail: initialData?.evidenceDetail || '',
    nextSchedule: initialData?.nextSchedule || '',
    actionItems: initialData?.actionItems || '',
    // 접견 전용
    clientCondition: initialData?.clientCondition || '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (name, value) => setForm({ ...form, [name]: value })

  const isAttendType = form.activityType === 'police_attend' || form.activityType === 'prosecution_attend'
  const isVisitType = form.activityType === 'visit'
  const isConsultType = form.activityType === 'consult'

  const handleSubmit = async (e) => {
    e.preventDefault()

    // 유형별 필수값 검증
    if (isConsultType && !form.content.trim()) return
    if (isAttendType && !form.location.trim()) return
    if (isVisitType && !form.content.trim()) return
    if (form.activityType === 'negotiation' && !form.content.trim()) return

    setIsSubmitting(true)
    try {
      const data = { ...form }
      if (!isEditing) {
        data.id = `cr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        data.createdAt = new Date().toISOString()
      }
      data.updatedAt = new Date().toISOString()
      await onSubmit(data)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isKakao = form.method === 'kakao'

  const canSubmit = isConsultType
    ? form.content.trim()
    : isAttendType
      ? form.location.trim()
      : isVisitType
        ? form.content.trim()
        : form.content.trim()

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        {/* 활동 유형 선택 */}
        <div>
          <Text size="sm" fw={500} mb={4}>활동 유형</Text>
          <Group gap={6} wrap="wrap">
            {activityTypes.map((t) => (
              <UnstyledButton
                key={t.value}
                onClick={() => handleChange('activityType', t.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1.5px solid ${form.activityType === t.value ? 'var(--mantine-color-indigo-5)' : 'var(--mantine-color-gray-3)'}`,
                  background: form.activityType === t.value ? 'var(--mantine-color-indigo-0)' : 'white',
                  fontSize: 13,
                }}
              >
                {t.icon} {t.label}
              </UnstyledButton>
            ))}
          </Group>
        </div>

        <Divider />

        {/* 날짜/시간 (공통) */}
        <Group grow>
          <TextInput
            label="날짜"
            type="date"
            required
            value={form.date}
            onChange={(e) => handleChange('date', e.currentTarget.value)}
          />
          <TextInput
            label="시간"
            type="time"
            required
            value={form.time}
            onChange={(e) => handleChange('time', e.currentTarget.value)}
          />
        </Group>

        {/* ===== 상담 유형 ===== */}
        {isConsultType && (
          <>
            <div>
              <Text size="sm" fw={500} mb={4}>상담 방식</Text>
              <Group gap={6}>
                {METHODS.map((m) => (
                  <UnstyledButton
                    key={m.value}
                    onClick={() => handleChange('method', m.value)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: `1.5px solid ${form.method === m.value ? 'var(--mantine-color-indigo-5)' : 'var(--mantine-color-gray-3)'}`,
                      background: form.method === m.value ? 'var(--mantine-color-indigo-0)' : 'white',
                      fontSize: 13,
                    }}
                  >
                    {m.icon} {m.label}
                  </UnstyledButton>
                ))}
              </Group>
            </div>

            <Textarea
              label="상담 내용"
              required
              withAsterisk
              minRows={6}
              autosize
              maxRows={12}
              placeholder={isKakao ? '카카오톡 대화 내용을 붙여넣기 하세요' : 'STT 변환 텍스트 붙여넣기 또는 직접 입력'}
              value={form.content}
              onChange={(e) => handleChange('content', e.currentTarget.value)}
            />
            {isKakao && (
              <Text size="xs" c="dimmed" mt={-8}>
                카카오톡 대화를 복사해서 붙여넣으세요
              </Text>
            )}

            <Textarea
              label="의뢰인 요청사항 (선택)"
              minRows={3}
              autosize
              maxRows={6}
              value={form.clientRequest}
              onChange={(e) => handleChange('clientRequest', e.currentTarget.value)}
            />
          </>
        )}

        {/* ===== 수사입회 유형 (경찰/검찰) ===== */}
        {isAttendType && (
          <>
            <TextInput
              label={form.activityType === 'police_attend' ? '경찰서명' : '검찰청명'}
              required
              withAsterisk
              placeholder={form.activityType === 'police_attend' ? '예: 서울중앙경찰서' : '예: 서울중앙지검'}
              value={form.location}
              onChange={(e) => handleChange('location', e.currentTarget.value)}
            />

            <TextInput
              label={form.activityType === 'police_attend' ? '수사관명' : '검사명'}
              placeholder="담당 수사관/검사 이름"
              value={form.investigatorName}
              onChange={(e) => handleChange('investigatorName', e.currentTarget.value)}
            />

            <Textarea
              label="피의자 진술 요지"
              minRows={4}
              autosize
              maxRows={10}
              placeholder="피의자의 주요 진술 내용을 요약하세요"
              value={form.suspectStatement}
              onChange={(e) => handleChange('suspectStatement', e.currentTarget.value)}
            />

            <Textarea
              label="수사관 질문 요약"
              minRows={4}
              autosize
              maxRows={10}
              placeholder="수사관의 주요 질문 사항을 요약하세요"
              value={form.investigatorQuestions}
              onChange={(e) => handleChange('investigatorQuestions', e.currentTarget.value)}
            />

            <div>
              <Switch
                label="증거 제출"
                checked={form.evidenceSubmitted}
                onChange={(e) => handleChange('evidenceSubmitted', e.currentTarget.checked)}
              />
              {form.evidenceSubmitted && (
                <Textarea
                  mt="xs"
                  placeholder="제출한 증거 내용을 기재하세요"
                  minRows={2}
                  autosize
                  maxRows={6}
                  value={form.evidenceDetail}
                  onChange={(e) => handleChange('evidenceDetail', e.currentTarget.value)}
                />
              )}
            </div>

            <TextInput
              label="다음 일정"
              placeholder="예: 2026-04-15 14:00 2차 조사"
              value={form.nextSchedule}
              onChange={(e) => handleChange('nextSchedule', e.currentTarget.value)}
            />

            <Textarea
              label="조치사항 / 특이사항"
              minRows={3}
              autosize
              maxRows={8}
              placeholder="변호인 의견, 이의 제기, 향후 대응 방향 등"
              value={form.actionItems}
              onChange={(e) => handleChange('actionItems', e.currentTarget.value)}
            />
          </>
        )}

        {/* ===== 접견 유형 ===== */}
        {isVisitType && (
          <>
            <TextInput
              label="장소"
              placeholder="예: 서울구치소, 서울남부교도소"
              value={form.location}
              onChange={(e) => handleChange('location', e.currentTarget.value)}
            />

            <TextInput
              label="의뢰인 상태"
              placeholder="건강 상태, 정서적 상태 등"
              value={form.clientCondition}
              onChange={(e) => handleChange('clientCondition', e.currentTarget.value)}
            />

            <Textarea
              label="접견 내용"
              required
              withAsterisk
              minRows={6}
              autosize
              maxRows={12}
              placeholder="접견 중 논의한 내용을 기록하세요"
              value={form.content}
              onChange={(e) => handleChange('content', e.currentTarget.value)}
            />

            <Textarea
              label="의뢰인 요청사항 (선택)"
              minRows={3}
              autosize
              maxRows={6}
              value={form.clientRequest}
              onChange={(e) => handleChange('clientRequest', e.currentTarget.value)}
            />
          </>
        )}

        {/* ===== 상대방 협의 유형 (민사) ===== */}
        {form.activityType === 'negotiation' && (
          <>
            <TextInput
              label="상대방 / 상대 대리인"
              placeholder="상대방 또는 상대 대리인 이름"
              value={form.investigatorName}
              onChange={(e) => handleChange('investigatorName', e.currentTarget.value)}
            />

            <TextInput
              label="장소 (선택)"
              placeholder="예: 법원 조정실, 상대 사무실"
              value={form.location}
              onChange={(e) => handleChange('location', e.currentTarget.value)}
            />

            <Textarea
              label="협의 내용"
              required
              withAsterisk
              minRows={6}
              autosize
              maxRows={12}
              placeholder="협의/협상 내용을 기록하세요"
              value={form.content}
              onChange={(e) => handleChange('content', e.currentTarget.value)}
            />

            <Textarea
              label="조치사항 / 후속 계획 (선택)"
              minRows={3}
              autosize
              maxRows={6}
              placeholder="합의 방향, 다음 단계 등"
              value={form.actionItems}
              onChange={(e) => handleChange('actionItems', e.currentTarget.value)}
            />
          </>
        )}

        {/* ===== 기타활동 유형 ===== */}
        {form.activityType === 'other_activity' && (
          <>
            <TextInput
              label="장소 (선택)"
              value={form.location}
              onChange={(e) => handleChange('location', e.currentTarget.value)}
            />

            <Textarea
              label="활동 내용"
              required
              withAsterisk
              minRows={6}
              autosize
              maxRows={12}
              placeholder="활동 내용을 기록하세요"
              value={form.content}
              onChange={(e) => handleChange('content', e.currentTarget.value)}
            />

            <Textarea
              label="조치사항 (선택)"
              minRows={3}
              autosize
              maxRows={6}
              value={form.actionItems}
              onChange={(e) => handleChange('actionItems', e.currentTarget.value)}
            />
          </>
        )}

        {/* 처리 상태 (공통) */}
        <div>
          <Text size="sm" fw={500} mb={4}>처리 상태</Text>
          <Group gap={6}>
            {STATUSES.map((s) => (
              <UnstyledButton
                key={s.value}
                onClick={() => handleChange('status', s.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: `1.5px solid ${form.status === s.value ? s.color : 'var(--mantine-color-gray-3)'}`,
                  background: form.status === s.value ? `${s.color}11` : 'white',
                  fontSize: 13,
                }}
              >
                {form.status === s.value && (
                  <Box
                    component="span"
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: s.color,
                      marginRight: 6,
                    }}
                  />
                )}
                {s.label}
              </UnstyledButton>
            ))}
          </Group>
        </div>

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onCancel}>취소</Button>
          <Button type="submit" loading={isSubmitting} disabled={!canSubmit}>
            {isEditing ? '수정' : '저장'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
