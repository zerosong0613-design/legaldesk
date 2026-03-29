import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Group, Text, Button, Card,
  SimpleGrid, Stack, Box, Container, UnstyledButton,
  TextInput, Select, Badge, Textarea,
  Table, ThemeIcon, Center, Loader,
  SegmentedControl, Divider, Progress, Tabs,
  Checkbox, NumberInput, Radio,
} from '@mantine/core'
import {
  IconPlus, IconReceipt,
  IconCash, IconCreditCard, IconTrash, IconEdit,
  IconSearch, IconChartBar, IconCheck, IconX,
  IconChevronDown, IconChevronUp, IconTrendingUp,
  IconTrendingDown, IconCalendarStats, IconArrowUpRight,
  IconArrowDownRight, IconMinus, IconFileInvoice,
  IconContract, IconCoin, IconClipboardList,
  IconPaperclip, IconAlertCircle, IconMail,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import { readCasesIndex, writeCasesIndex } from '../api/drive'
import Modal from '../components/ui/Modal'

// --- 상수 ---

const RETAINER_TYPES = [
  { value: 'mixed', label: '착수금 + 성공보수' },
  { value: 'fixed', label: '착수금 고정' },
  { value: 'hourly', label: '시간제' },
  { value: 'contingency', label: '성공보수 전용' },
]

const DISBURSEMENT_CATEGORIES = [
  { value: '인지대', label: '인지대' },
  { value: '송달료', label: '송달료' },
  { value: '집행비용', label: '집행비용' },
  { value: '감정료', label: '감정료' },
  { value: '번역료', label: '번역료' },
  { value: '출장비(교통)', label: '출장비(교통)' },
  { value: '숙박비', label: '숙박비' },
  { value: '복사·인쇄비', label: '복사·인쇄비' },
  { value: '우편·택배비', label: '우편·택배비' },
  { value: '외부 전문가 비용', label: '외부 전문가 비용' },
  { value: '공증료', label: '공증료' },
  { value: '등록면허세', label: '등록면허세' },
  { value: '기타', label: '기타' },
]

const INVOICE_STATUSES = {
  draft: { label: '초안', color: 'gray', icon: '📋' },
  sent: { label: '발송', color: 'blue', icon: '📤' },
  paid: { label: '완납', color: 'green', icon: '✅' },
  overdue: { label: '연체', color: 'red', icon: '❌' },
  cancelled: { label: '취소', color: 'gray', icon: '—' },
}

const PAYMENT_STATUS = {
  paid: { label: '완납', color: 'green' },
  partial: { label: '일부입금', color: 'orange' },
  unpaid: { label: '미입금', color: 'red' },
  pending: { label: '확인대기', color: 'gray' },
}

const MONTH_NAMES = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

// --- 금액 유틸리티 ---

function numberToKorean(num) {
  if (!num && num !== 0) return ''
  const n = Math.abs(Number(num))
  if (isNaN(n) || n === 0) return '0원'
  const eok = Math.floor(n / 100000000)
  const man = Math.floor((n % 100000000) / 10000)
  const rest = n % 10000
  const parts = []
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}억`)
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`)
  if (rest > 0) parts.push(`${rest.toLocaleString('ko-KR')}`)
  return parts.join(' ') + '원'
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '-'
  return Number(amount).toLocaleString('ko-KR') + '원'
}

function formatCurrencyShort(amount) {
  if (!amount && amount !== 0) return '0'
  const n = Math.abs(Number(amount))
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString('ko-KR')}만`
  return n.toLocaleString('ko-KR')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function stripNonDigits(str) {
  return str.replace(/[^0-9]/g, '')
}

function formatWithCommas(numStr) {
  if (!numStr) return ''
  return Number(numStr).toLocaleString('ko-KR')
}

// --- 금액 입력 ---

function AmountInput({ value, onChange, label, required, withAsterisk }) {
  const rawStr = String(value || '')
  const display = rawStr ? formatWithCommas(rawStr) : ''
  const koreanText = rawStr && Number(rawStr) > 0 ? numberToKorean(rawStr) : ''
  return (
    <Box>
      <TextInput
        label={label}
        placeholder="0"
        required={required}
        withAsterisk={withAsterisk}
        value={display}
        onChange={(e) => onChange(stripNonDigits(e.currentTarget.value))}
        styles={{ input: { fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' } }}
      />
      {koreanText && <Text size="xs" c="indigo" mt={2} fw={500}>{koreanText}</Text>}
    </Box>
  )
}

// --- 결제 상태 계산 ---

function getPaymentStatus(total, paid) {
  if (!total || total <= 0) return null
  if (paid >= total) return PAYMENT_STATUS.paid
  if (paid > 0) return PAYMENT_STATUS.partial
  return PAYMENT_STATUS.unpaid
}

// --- 비율 변화 뱃지 ---

function ChangeBadge({ current, previous }) {
  if (!previous || previous === 0) {
    if (current > 0) return <Badge size="xs" variant="light" color="teal" leftSection={<IconArrowUpRight size={10} />}>신규</Badge>
    return null
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return <Badge size="xs" variant="light" color="gray" leftSection={<IconMinus size={10} />}>동일</Badge>
  const isUp = pct > 0
  return (
    <Badge size="xs" variant="light" color={isUp ? 'teal' : 'red'} leftSection={isUp ? <IconArrowUpRight size={10} /> : <IconArrowDownRight size={10} />}>
      {isUp ? '+' : ''}{pct}%
    </Badge>
  )
}

// --- CSS 바 차트 ---

function BarChart({ data, maxValue, color, labelKey, valueKey }) {
  const max = maxValue || Math.max(...data.map((d) => d[valueKey] || 0), 1)
  return (
    <Stack gap={6}>
      {data.map((d, i) => {
        const val = d[valueKey] || 0
        const pct = max > 0 ? (val / max) * 100 : 0
        return (
          <Group key={i} gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" w={36} ta="right" style={{ flexShrink: 0 }}>{d[labelKey]}</Text>
            <Box style={{ flex: 1, position: 'relative', height: 22, borderRadius: 4, backgroundColor: 'var(--mantine-color-gray-1)' }}>
              <Box style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${Math.max(pct, val > 0 ? 2 : 0)}%`,
                borderRadius: 4,
                backgroundColor: `var(--mantine-color-${color}-${val > 0 ? 5 : 1})`,
                transition: 'width 0.3s ease',
              }} />
              {val > 0 && (
                <Text size="xs" fw={500} style={{ position: 'absolute', right: 6, top: 2, lineHeight: '18px' }}>
                  {formatCurrencyShort(val)}
                </Text>
              )}
            </Box>
          </Group>
        )
      })}
    </Stack>
  )
}

// ==================================================
// 섹션 ① 수임 계약 패널
// ==================================================

function RetainerForm({ cases, consultations, initialData, onSubmit, onCancel }) {
  const isEditing = !!initialData
  const allItems = useMemo(() => {
    const items = []
    for (const c of cases) items.push({ value: c.id, label: `[사건] ${c.clientName} ${c.caseNumber ? `(${c.caseNumber})` : ''}` })
    for (const c of consultations) items.push({ value: c.id, label: `[자문] ${c.clientName} ${c.subject ? `— ${c.subject}` : ''}` })
    return items
  }, [cases, consultations])

  const [form, setForm] = useState({
    caseId: initialData?.caseId || '',
    type: initialData?.type || 'mixed',
    contractDate: initialData?.contractDate || new Date().toISOString().split('T')[0],
    vatIncluded: initialData?.vatIncluded ?? false,
    retainerFee: initialData?.retainerFee ? String(initialData.retainerFee) : '',
    retainerPaid: initialData?.retainerPaid ? String(initialData.retainerPaid) : '0',
    retainerPaidAt: initialData?.retainerPaidAt || '',
    retainerNote: initialData?.retainerNote || '',
    contingencyFee: initialData?.contingencyFee ? String(initialData.contingencyFee) : '',
    contingencyType: initialData?.contingencyType || 'fixed',
    contingencyPercent: initialData?.contingencyPercent ? String(initialData.contingencyPercent) : '',
    contingencyBasis: initialData?.contingencyBasis ? String(initialData.contingencyBasis) : '',
    contingencyNote: initialData?.contingencyNote || '',
    contingencyPaid: initialData?.contingencyPaid ? String(initialData.contingencyPaid) : '0',
    contingencyPaidAt: initialData?.contingencyPaidAt || '',
    hourlyRate: initialData?.hourlyRate ? String(initialData.hourlyRate) : '',
    memo: initialData?.memo || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const h = (name, value) => setForm({ ...form, [name]: value })
  const showRetainer = form.type === 'fixed' || form.type === 'mixed'
  const showContingency = form.type === 'contingency' || form.type === 'mixed'
  const showHourly = form.type === 'hourly'

  const calcContingency = form.contingencyType === 'percent' && form.contingencyPercent && form.contingencyBasis
    ? Math.round(Number(form.contingencyBasis) * Number(form.contingencyPercent) / 100)
    : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.caseId) return
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...form,
        retainerFee: Number(form.retainerFee) || 0,
        retainerPaid: Number(form.retainerPaid) || 0,
        contingencyFee: calcContingency || Number(form.contingencyFee) || 0,
        contingencyPaid: Number(form.contingencyPaid) || 0,
        contingencyPercent: Number(form.contingencyPercent) || null,
        contingencyBasis: Number(form.contingencyBasis) || null,
        hourlyRate: Number(form.hourlyRate) || null,
        hoursLogged: initialData?.hoursLogged || 0,
        hourlyPaid: initialData?.hourlyPaid || 0,
        id: isEditing ? initialData.id : `ret-${Date.now()}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Select label="사건 / 자문" placeholder="선택하세요" data={allItems} value={form.caseId} onChange={(v) => h('caseId', v)} searchable required withAsterisk />
        <SimpleGrid cols={2}>
          <Select label="수임 유형" data={RETAINER_TYPES} value={form.type} onChange={(v) => h('type', v)} />
          <TextInput label="계약일" type="date" value={form.contractDate} onChange={(e) => h('contractDate', e.currentTarget.value)} required withAsterisk />
        </SimpleGrid>
        <Radio.Group label="부가세" value={form.vatIncluded ? 'included' : 'excluded'} onChange={(v) => h('vatIncluded', v === 'included')}>
          <Group gap="lg" mt={4}>
            <Radio value="excluded" label="별도" />
            <Radio value="included" label="포함" />
          </Group>
        </Radio.Group>

        {showRetainer && (
          <>
            <Divider label="착수금" labelPosition="left" />
            <AmountInput label="착수금 금액" required withAsterisk value={form.retainerFee} onChange={(v) => h('retainerFee', v)} />
            <SimpleGrid cols={2}>
              <AmountInput label="입금액" value={form.retainerPaid} onChange={(v) => h('retainerPaid', v)} />
              <TextInput label="입금일" type="date" value={form.retainerPaidAt} onChange={(e) => h('retainerPaidAt', e.currentTarget.value)} />
            </SimpleGrid>
            <TextInput label="착수금 메모" placeholder="예: 분할 입금 예정" value={form.retainerNote} onChange={(e) => h('retainerNote', e.currentTarget.value)} />
          </>
        )}

        {showContingency && (
          <>
            <Divider label="성공보수" labelPosition="left" />
            <Radio.Group label="성공보수 유형" value={form.contingencyType} onChange={(v) => h('contingencyType', v)}>
              <Group gap="lg" mt={4}>
                <Radio value="fixed" label="고정액" />
                <Radio value="percent" label="소가 대비 %" />
              </Group>
            </Radio.Group>
            {form.contingencyType === 'fixed' ? (
              <AmountInput label="성공보수 금액" value={form.contingencyFee} onChange={(v) => h('contingencyFee', v)} />
            ) : (
              <SimpleGrid cols={2}>
                <TextInput label="비율 (%)" placeholder="10" value={form.contingencyPercent} onChange={(e) => h('contingencyPercent', stripNonDigits(e.currentTarget.value))} />
                <AmountInput label="소가 (계산 기준)" value={form.contingencyBasis} onChange={(v) => h('contingencyBasis', v)} />
              </SimpleGrid>
            )}
            {calcContingency && (
              <Text size="sm" c="indigo" fw={500}>자동 계산: {formatCurrency(calcContingency)}</Text>
            )}
            <TextInput label="조건 메모" placeholder="예: 1심 승소 시" value={form.contingencyNote} onChange={(e) => h('contingencyNote', e.currentTarget.value)} />
          </>
        )}

        {showHourly && (
          <>
            <Divider label="시간제" labelPosition="left" />
            <AmountInput label="시간당 단가" value={form.hourlyRate} onChange={(v) => h('hourlyRate', v)} />
          </>
        )}

        <TextInput label="메모" placeholder="기타 메모" value={form.memo} onChange={(e) => h('memo', e.currentTarget.value)} />

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onCancel} leftSection={<IconX size={14} />}>취소</Button>
          <Button type="submit" loading={isSubmitting} disabled={!form.caseId} leftSection={<IconCheck size={14} />}>{isEditing ? '수정' : '등록'}</Button>
        </Group>
      </Stack>
    </form>
  )
}

function RetainerCard({ retainer, getItemName, onEdit, onDelete, onPaymentConfirm }) {
  const item = getItemName(retainer.caseId)
  const showRetainer = retainer.type === 'fixed' || retainer.type === 'mixed'
  const showContingency = retainer.type === 'contingency' || retainer.type === 'mixed'
  const showHourly = retainer.type === 'hourly'

  const retainerStatus = showRetainer ? getPaymentStatus(retainer.retainerFee, retainer.retainerPaid) : null
  const contingencyStatus = showContingency ? getPaymentStatus(retainer.contingencyFee, retainer.contingencyPaid) : null
  const retainerPct = retainer.retainerFee > 0 ? Math.min((retainer.retainerPaid / retainer.retainerFee) * 100, 100) : 0
  const contingencyPct = retainer.contingencyFee > 0 ? Math.min((retainer.contingencyPaid / retainer.contingencyFee) * 100, 100) : 0

  const typeLabel = RETAINER_TYPES.find((t) => t.value === retainer.type)?.label || retainer.type

  return (
    <Card padding="lg" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <Text fw={600}>수임 계약</Text>
          <Badge variant="light" color="indigo" size="sm">{typeLabel}</Badge>
        </Group>
        <Group gap="xs">
          <Button variant="subtle" size="xs" color="gray" leftSection={<IconEdit size={14} />} onClick={() => onEdit(retainer)}>수정</Button>
          <Button variant="subtle" size="xs" color="red" leftSection={<IconTrash size={14} />} onClick={() => onDelete(retainer.id)}>삭제</Button>
        </Group>
      </Group>

      <Group gap="xs" mb="xs">
        <Text size="sm" fw={500} c="indigo">{item.name}</Text>
        {item.sub && <Text size="xs" c="dimmed">{item.sub}</Text>}
      </Group>
      <Text size="xs" c="dimmed" mb="md">계약일: {formatDate(retainer.contractDate)} · 부가세: {retainer.vatIncluded ? '포함' : '별도'}</Text>

      <Stack gap="md">
        {showRetainer && (
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>착수금</Text>
              <Group gap="xs">
                <Text size="sm" fw={600}>{formatCurrency(retainer.retainerFee)}</Text>
                {retainerStatus && <Badge size="xs" color={retainerStatus.color}>{retainerStatus.label}</Badge>}
              </Group>
            </Group>
            <Progress value={retainerPct} color={retainerPct >= 100 ? 'green' : retainerPct > 0 ? 'orange' : 'red'} size="sm" mb={4} />
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                입금: {formatCurrency(retainer.retainerPaid)}
                {retainer.retainerPaidAt && ` (${formatDate(retainer.retainerPaidAt)})`}
              </Text>
              {retainer.retainerPaid < retainer.retainerFee && (
                <Button variant="light" size="xs" color="teal" onClick={() => onPaymentConfirm(retainer, 'retainer')}>
                  입금 확인
                </Button>
              )}
            </Group>
            {retainer.retainerNote && <Text size="xs" c="dimmed" mt={2}>{retainer.retainerNote}</Text>}
          </Box>
        )}

        {showContingency && (
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>성공보수</Text>
              <Group gap="xs">
                <Text size="sm" fw={600}>{formatCurrency(retainer.contingencyFee)}</Text>
                {retainer.contingencyNote && <Text size="xs" c="dimmed">({retainer.contingencyNote})</Text>}
                {contingencyStatus && <Badge size="xs" color={contingencyStatus.color}>{contingencyStatus.label}</Badge>}
              </Group>
            </Group>
            <Progress value={contingencyPct} color={contingencyPct >= 100 ? 'green' : contingencyPct > 0 ? 'orange' : 'gray'} size="sm" mb={4} />
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                입금: {formatCurrency(retainer.contingencyPaid)}
                {retainer.contingencyPaidAt && ` (${formatDate(retainer.contingencyPaidAt)})`}
              </Text>
              {retainer.contingencyPaid < retainer.contingencyFee && (
                <Button variant="light" size="xs" color="teal" onClick={() => onPaymentConfirm(retainer, 'contingency')}>
                  입금 확인
                </Button>
              )}
            </Group>
          </Box>
        )}

        {showHourly && (
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>시간제</Text>
              <Text size="sm" fw={600}>시간당 {formatCurrency(retainer.hourlyRate)}</Text>
            </Group>
            <Group gap="lg">
              <Text size="xs" c="dimmed">누적: {retainer.hoursLogged || 0}시간</Text>
              <Text size="xs" c="dimmed">합계: {formatCurrency((retainer.hoursLogged || 0) * (retainer.hourlyRate || 0))}</Text>
              <Text size="xs" c="dimmed">입금: {formatCurrency(retainer.hourlyPaid || 0)}</Text>
            </Group>
          </Box>
        )}
      </Stack>

      {retainer.memo && (
        <Text size="xs" c="dimmed" mt="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)', paddingTop: 8 }}>
          {retainer.memo}
        </Text>
      )}
    </Card>
  )
}

function RetainerPanel({ retainers, cases, consultations, getItemName, onSave }) {
  const { openModal, closeModal, isModalOpen, modalType, modalData, showToast } = useUiStore()
  const [editingData, setEditingData] = useState(null)

  const handleCreate = async (formData) => {
    const newRetainers = [...retainers, { ...formData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]
    await onSave('retainers', newRetainers)
    closeModal()
    showToast('수임 계약이 등록되었습니다.', 'success')
  }

  const handleEdit = async (formData) => {
    const newRetainers = retainers.map((r) => r.id === formData.id ? { ...r, ...formData, updatedAt: new Date().toISOString() } : r)
    await onSave('retainers', newRetainers)
    setEditingData(null)
    closeModal()
    showToast('수임 계약이 수정되었습니다.', 'success')
  }

  const handleDelete = async (id) => {
    if (!confirm('이 수임 계약을 삭제하시겠습니까?')) return
    const newRetainers = retainers.filter((r) => r.id !== id)
    await onSave('retainers', newRetainers)
    showToast('수임 계약이 삭제되었습니다.', 'success')
  }

  const handlePaymentConfirm = (retainer, feeType) => {
    setEditingData(retainer)
    openModal('paymentConfirm', { retainer, feeType })
  }

  const handlePaymentSubmit = async (amount, date) => {
    const { retainer: ret, feeType } = modalData
    const field = feeType === 'retainer' ? 'retainerPaid' : 'contingencyPaid'
    const dateField = feeType === 'retainer' ? 'retainerPaidAt' : 'contingencyPaidAt'
    const newRetainers = retainers.map((r) =>
      r.id === ret.id ? { ...r, [field]: Number(amount), [dateField]: date, updatedAt: new Date().toISOString() } : r
    )
    await onSave('retainers', newRetainers)
    closeModal()
    showToast('입금이 확인되었습니다.', 'success')
  }

  // 통계
  const totalRetainerFee = retainers.reduce((s, r) => s + (r.retainerFee || 0), 0)
  const totalRetainerPaid = retainers.reduce((s, r) => s + (r.retainerPaid || 0), 0)
  const totalContingencyFee = retainers.reduce((s, r) => s + (r.contingencyFee || 0), 0)
  const totalContingencyPaid = retainers.reduce((s, r) => s + (r.contingencyPaid || 0), 0)
  const totalUnpaid = (totalRetainerFee - totalRetainerPaid) + (totalContingencyFee - totalContingencyPaid)

  return (
    <Stack gap="md">
      {/* 수임료 요약 */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Card padding="md" bg="indigo.0">
          <Text size="xs" c="dimmed" mb={4}>착수금 총액</Text>
          <Text size="lg" fw={700} c="indigo">{formatCurrencyShort(totalRetainerFee)}</Text>
        </Card>
        <Card padding="md" bg="teal.0">
          <Text size="xs" c="dimmed" mb={4}>착수금 입금</Text>
          <Text size="lg" fw={700} c="teal">{formatCurrencyShort(totalRetainerPaid)}</Text>
        </Card>
        <Card padding="md" bg="grape.0">
          <Text size="xs" c="dimmed" mb={4}>성공보수</Text>
          <Text size="lg" fw={700} c="grape">{formatCurrencyShort(totalContingencyFee)}</Text>
        </Card>
        <Card padding="md" bg={totalUnpaid > 0 ? 'red.0' : 'green.0'}>
          <Text size="xs" c="dimmed" mb={4}>미수금</Text>
          <Text size="lg" fw={700} c={totalUnpaid > 0 ? 'red' : 'green'}>{formatCurrencyShort(totalUnpaid)}</Text>
        </Card>
      </SimpleGrid>

      {/* 계약 목록 */}
      {retainers.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <ThemeIcon size={48} radius="xl" variant="light" color="indigo"><IconContract size={24} /></ThemeIcon>
            <Text c="dimmed" size="sm">등록된 수임 계약이 없습니다</Text>
            <Text size="xs" c="dimmed">수임료 구조를 입력하면 청구·수금 현황을 관리할 수 있습니다.</Text>
            <Button variant="subtle" leftSection={<IconPlus size={14} />} onClick={() => openModal('createRetainer')}>
              수임 계약 등록
            </Button>
          </Stack>
        </Center>
      ) : (
        <Stack gap="md">
          {retainers.map((ret) => (
            <RetainerCard
              key={ret.id}
              retainer={ret}
              getItemName={getItemName}
              onEdit={(data) => { setEditingData(data); openModal('editRetainer') }}
              onDelete={handleDelete}
              onPaymentConfirm={handlePaymentConfirm}
            />
          ))}
        </Stack>
      )}

      {/* 수임 계약 등록 모달 */}
      <Modal isOpen={isModalOpen && modalType === 'createRetainer'} onClose={closeModal} title="수임 계약 등록">
        <RetainerForm cases={cases} consultations={consultations} onSubmit={handleCreate} onCancel={closeModal} />
      </Modal>

      {/* 수임 계약 수정 모달 */}
      <Modal isOpen={isModalOpen && modalType === 'editRetainer'} onClose={() => { closeModal(); setEditingData(null) }} title="수임 계약 수정">
        {editingData && <RetainerForm cases={cases} consultations={consultations} initialData={editingData} onSubmit={handleEdit} onCancel={() => { closeModal(); setEditingData(null) }} />}
      </Modal>

      {/* 입금 확인 모달 */}
      <Modal isOpen={isModalOpen && modalType === 'paymentConfirm'} onClose={closeModal} title="입금 확인">
        {modalData && <PaymentConfirmForm modalData={modalData} onSubmit={handlePaymentSubmit} onCancel={closeModal} />}
      </Modal>
    </Stack>
  )
}

function PaymentConfirmForm({ modalData, onSubmit, onCancel }) {
  const { retainer, feeType } = modalData
  const currentAmount = feeType === 'retainer' ? retainer.retainerFee : retainer.contingencyFee
  const [amount, setAmount] = useState(String(currentAmount || ''))
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try { await onSubmit(amount, date) } finally { setIsSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Text size="sm" c="dimmed">{feeType === 'retainer' ? '착수금' : '성공보수'}: {formatCurrency(currentAmount)}</Text>
        <AmountInput label="실제 입금액" required withAsterisk value={amount} onChange={setAmount} />
        <TextInput label="입금일" type="date" value={date} onChange={(e) => setDate(e.currentTarget.value)} required />
        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onCancel}>취소</Button>
          <Button type="submit" loading={isSubmitting} color="teal" leftSection={<IconCheck size={14} />}>확인 저장</Button>
        </Group>
      </Stack>
    </form>
  )
}

// ==================================================
// 섹션 ② 실비 내역 패널
// ==================================================

function DisbursementForm({ cases, consultations, initialData, onSubmit, onCancel }) {
  const isEditing = !!initialData
  const allItems = useMemo(() => {
    const items = []
    for (const c of cases) items.push({ value: c.id, label: `[사건] ${c.clientName} ${c.caseNumber ? `(${c.caseNumber})` : ''}` })
    for (const c of consultations) items.push({ value: c.id, label: `[자문] ${c.clientName} ${c.subject ? `— ${c.subject}` : ''}` })
    return items
  }, [cases, consultations])

  const [form, setForm] = useState({
    caseId: initialData?.caseId || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    category: initialData?.category || '',
    amount: initialData?.amount ? String(initialData.amount) : '',
    description: initialData?.description || '',
    billable: initialData?.billable ?? true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const h = (name, value) => setForm({ ...form, [name]: value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.caseId || !form.category || !form.amount) return
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...form,
        amount: Number(form.amount),
        billed: initialData?.billed || false,
        paidByClient: initialData?.paidByClient || false,
        id: isEditing ? initialData.id : `disb-${Date.now()}`,
      })
    } finally { setIsSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Select label="사건 / 자문" placeholder="선택하세요" data={allItems} value={form.caseId} onChange={(v) => h('caseId', v)} searchable required withAsterisk />
        <SimpleGrid cols={2}>
          <TextInput label="날짜" type="date" value={form.date} onChange={(e) => h('date', e.currentTarget.value)} required withAsterisk />
          <Select label="카테고리" placeholder="선택" data={DISBURSEMENT_CATEGORIES} value={form.category} onChange={(v) => h('category', v)} searchable required withAsterisk />
        </SimpleGrid>
        <AmountInput label="금액" required withAsterisk value={form.amount} onChange={(v) => h('amount', v)} />
        <TextInput label="내용" placeholder="예: 2026가합1234 인지대" value={form.description} onChange={(e) => h('description', e.currentTarget.value)} />
        <Checkbox label="의뢰인 청구 대상" checked={form.billable} onChange={(e) => h('billable', e.currentTarget.checked)} />
        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onCancel} leftSection={<IconX size={14} />}>취소</Button>
          <Button type="submit" loading={isSubmitting} disabled={!form.caseId || !form.category || !form.amount} leftSection={<IconCheck size={14} />}>{isEditing ? '수정' : '등록'}</Button>
        </Group>
      </Stack>
    </form>
  )
}

function DisbursementPanel({ disbursements, cases, consultations, getItemName, onSave }) {
  const { openModal, closeModal, isModalOpen, modalType, showToast } = useUiStore()
  const [editingData, setEditingData] = useState(null)
  const [filterCategory, setFilterCategory] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleCreate = async (formData) => {
    const newList = [...disbursements, { ...formData, createdAt: new Date().toISOString() }]
    await onSave('disbursements', newList)
    closeModal()
    showToast('실비가 등록되었습니다.', 'success')
  }

  const handleEdit = async (formData) => {
    const newList = disbursements.map((d) => d.id === formData.id ? { ...d, ...formData } : d)
    await onSave('disbursements', newList)
    setEditingData(null)
    closeModal()
    showToast('실비가 수정되었습니다.', 'success')
  }

  const handleDelete = async (id) => {
    if (!confirm('이 실비를 삭제하시겠습니까?')) return
    await onSave('disbursements', disbursements.filter((d) => d.id !== id))
    showToast('실비가 삭제되었습니다.', 'success')
  }

  const unbilledCount = disbursements.filter((d) => d.billable && !d.billed).length
  const unbilledAmount = disbursements.filter((d) => d.billable && !d.billed).reduce((s, d) => s + (d.amount || 0), 0)
  const totalAmount = disbursements.reduce((s, d) => s + (d.amount || 0), 0)

  const filtered = useMemo(() => {
    let result = [...disbursements]
    if (filterCategory) result = result.filter((d) => d.category === filterCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((d) => {
        const item = getItemName(d.caseId)
        return item.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q) || d.category?.toLowerCase().includes(q)
      })
    }
    return result.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
  }, [disbursements, filterCategory, searchQuery])

  return (
    <Stack gap="md">
      {/* 요약 */}
      <Group justify="space-between">
        <Group gap="xs">
          <Text size="sm" c="dimmed">전체: {disbursements.length}건 / {formatCurrency(totalAmount)}</Text>
          {unbilledCount > 0 && (
            <Badge color="orange" variant="light" size="sm">
              미청구: {unbilledCount}건 / {formatCurrency(unbilledAmount)}
            </Badge>
          )}
        </Group>
      </Group>

      {/* 검색 + 카테고리 필터 */}
      <TextInput placeholder="의뢰인명, 내용 검색..." leftSection={<IconSearch size={16} />} value={searchQuery} onChange={(e) => setSearchQuery(e.currentTarget.value)} />
      <Group gap="xs" style={{ flexWrap: 'wrap' }}>
        <Button variant={filterCategory === null ? 'filled' : 'default'} size="xs" onClick={() => setFilterCategory(null)}>전체</Button>
        {DISBURSEMENT_CATEGORIES.slice(0, 8).map((c) => {
          const count = disbursements.filter((d) => d.category === c.value).length
          if (count === 0) return null
          return (
            <Button key={c.value} variant={filterCategory === c.value ? 'filled' : 'default'} size="xs" onClick={() => setFilterCategory(filterCategory === c.value ? null : c.value)}>
              {c.label} ({count})
            </Button>
          )
        })}
      </Group>

      {/* 테이블 */}
      {filtered.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <ThemeIcon size={48} radius="xl" variant="light" color="orange"><IconCoin size={24} /></ThemeIcon>
            <Text c="dimmed" size="sm">{disbursements.length === 0 ? '등록된 실비가 없습니다' : '검색 결과가 없습니다'}</Text>
            {disbursements.length === 0 && (
              <Button variant="subtle" leftSection={<IconPlus size={14} />} onClick={() => openModal('createDisbursement')}>첫 실비 등록하기</Button>
            )}
          </Stack>
        </Center>
      ) : (
        <Card padding={0}>
          <Table.ScrollContainer minWidth={700}>
            <Table striped={false} highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>날짜</Table.Th>
                  <Table.Th>카테고리</Table.Th>
                  <Table.Th>사건/자문</Table.Th>
                  <Table.Th>금액</Table.Th>
                  <Table.Th>내용</Table.Th>
                  <Table.Th>청구</Table.Th>
                  <Table.Th style={{ width: 80 }}></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((d) => {
                  const item = getItemName(d.caseId)
                  return (
                    <Table.Tr key={d.id}>
                      <Table.Td><Text size="sm" ff="monospace">{formatDate(d.date)}</Text></Table.Td>
                      <Table.Td><Badge variant="light" color="orange" size="sm">{d.category}</Badge></Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>{item.name}</Text>
                        {item.sub && <Text size="xs" c="dimmed">{item.sub}</Text>}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={600}>{formatCurrency(d.amount)}</Text>
                        {d.amount >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(d.amount)}</Text>}
                      </Table.Td>
                      <Table.Td><Text size="xs" c="dimmed" truncate style={{ maxWidth: 200 }}>{d.description || '-'}</Text></Table.Td>
                      <Table.Td>
                        {d.billable ? (
                          d.billed
                            ? <Badge size="xs" color="green">청구완료</Badge>
                            : <Badge size="xs" color="orange">미청구</Badge>
                        ) : (
                          <Badge size="xs" color="gray" variant="outline">비청구</Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          <UnstyledButton onClick={() => { setEditingData(d); openModal('editDisbursement') }}>
                            <IconEdit size={14} color="gray" />
                          </UnstyledButton>
                          <UnstyledButton onClick={() => handleDelete(d.id)}>
                            <IconTrash size={14} color="var(--mantine-color-red-5)" />
                          </UnstyledButton>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}

      {/* 실비 등록 모달 */}
      <Modal isOpen={isModalOpen && modalType === 'createDisbursement'} onClose={closeModal} title="실비 추가">
        <DisbursementForm cases={cases} consultations={consultations} onSubmit={handleCreate} onCancel={closeModal} />
      </Modal>

      {/* 실비 수정 모달 */}
      <Modal isOpen={isModalOpen && modalType === 'editDisbursement'} onClose={() => { closeModal(); setEditingData(null) }} title="실비 수정">
        {editingData && <DisbursementForm cases={cases} consultations={consultations} initialData={editingData} onSubmit={handleEdit} onCancel={() => { closeModal(); setEditingData(null) }} />}
      </Modal>
    </Stack>
  )
}

// ==================================================
// Gmail 발송 유틸리티
// ==================================================

function buildInvoiceEmailBody(invoice, caseInfo) {
  const itemRows = (invoice.lineItems || []).map((li) =>
    `${li.label}${li.note ? ` (${li.note})` : ''}\t${formatCurrency(li.amount)}`
  ).join('\n')

  return [
    `안녕하세요, ${invoice.clientName} 님.`,
    '',
    '아래와 같이 청구서를 발송합니다.',
    '',
    `청구번호: ${invoice.invoiceNumber}`,
    `사건: ${caseInfo.sub || ''} ${caseInfo.name}`,
    '',
    '───────────────────────────',
    '항목\t\t\t금액',
    '───────────────────────────',
    itemRows,
    '───────────────────────────',
    `소계\t\t\t${formatCurrency(invoice.subtotal)}`,
    invoice.vatAmount > 0 ? `부가세 (10%)\t\t${formatCurrency(invoice.vatAmount)}` : '',
    `합계\t\t\t${formatCurrency(invoice.total)}`,
    '───────────────────────────',
    '',
    `납부기한: ${formatDate(invoice.dueDate)}`,
    '',
    '감사합니다.',
  ].filter(Boolean).join('\n')
}

function openGmailCompose(to, subject, body) {
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.open(gmailUrl, '_blank')
}

// ==================================================
// 청구서 상세 모달
// ==================================================

function InvoiceDetailModal({ invoice, caseInfo, isOpen, onClose, onSend, onPaymentConfirm, onDelete }) {
  if (!invoice) return null
  const st = INVOICE_STATUSES[invoice.status] || INVOICE_STATUSES.draft
  const isOverdue = invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.dueDate && new Date(invoice.dueDate) < new Date()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="청구서 상세">
      <Stack gap="md">
        {/* 헤더 정보 */}
        <Card padding="md" bg="gray.0">
          <Group justify="space-between" mb="sm">
            <Text size="lg" fw={700} ff="monospace">{invoice.invoiceNumber}</Text>
            <Badge color={isOverdue ? 'red' : st.color} variant="light" size="lg">
              {isOverdue ? '연체' : st.label}
            </Badge>
          </Group>
          <SimpleGrid cols={2} spacing="xs">
            <Box>
              <Text size="xs" c="dimmed">수신인</Text>
              <Text size="sm" fw={500}>{invoice.clientName}</Text>
              {invoice.clientEmail && <Text size="xs" c="dimmed">{invoice.clientEmail}</Text>}
            </Box>
            <Box>
              <Text size="xs" c="dimmed">사건</Text>
              <Text size="sm" fw={500}>{caseInfo.name}</Text>
              {caseInfo.sub && <Text size="xs" c="dimmed">{caseInfo.sub}</Text>}
            </Box>
            <Box>
              <Text size="xs" c="dimmed">발행일</Text>
              <Text size="sm">{formatDate(invoice.issueDate)}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">납부기한</Text>
              <Text size="sm" c={isOverdue ? 'red' : undefined} fw={isOverdue ? 600 : 400}>{formatDate(invoice.dueDate)}</Text>
            </Box>
          </SimpleGrid>
        </Card>

        {/* 항목 명세 */}
        <Box>
          <Text size="sm" fw={600} mb="xs">청구 항목</Text>
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>항목</Table.Th>
                <Table.Th>비고</Table.Th>
                <Table.Th ta="right">금액</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(invoice.lineItems || []).map((li, i) => (
                <Table.Tr key={i}>
                  <Table.Td><Text size="sm" fw={500}>{li.label}</Text></Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">{li.note || '-'}</Text></Table.Td>
                  <Table.Td ta="right"><Text size="sm" fw={600}>{formatCurrency(li.amount)}</Text></Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Box>

        {/* 합계 */}
        <Card padding="sm" bg="indigo.0">
          <Group justify="space-between">
            <Text size="sm">소계</Text>
            <Text size="sm" fw={500}>{formatCurrency(invoice.subtotal)}</Text>
          </Group>
          {invoice.vatAmount > 0 && (
            <Group justify="space-between" mt={4}>
              <Text size="sm">부가세 (10%)</Text>
              <Text size="sm" fw={500}>{formatCurrency(invoice.vatAmount)}</Text>
            </Group>
          )}
          <Divider my="xs" />
          <Group justify="space-between">
            <Text size="sm" fw={700}>합계</Text>
            <Text size="lg" fw={700} c="indigo">{formatCurrency(invoice.total)}</Text>
          </Group>
          {invoice.total >= 10000 && <Text size="xs" c="dimmed" ta="right">{numberToKorean(invoice.total)}</Text>}
        </Card>

        {/* 입금 정보 */}
        {invoice.status === 'paid' && (
          <Card padding="sm" bg="green.0">
            <Group gap="xs">
              <IconCheck size={16} color="var(--mantine-color-green-7)" />
              <Text size="sm" fw={500} c="green.8">입금 확인 완료</Text>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              입금액: {formatCurrency(invoice.paidAmount)} · 입금일: {formatDate(invoice.paidAt)}
            </Text>
          </Card>
        )}

        {/* 발송 이력 */}
        {invoice.sentAt && (
          <Text size="xs" c="dimmed">이메일 발송: {formatDate(invoice.sentAt)}</Text>
        )}

        {/* 액션 버튼 */}
        <Divider />
        <Group justify="space-between">
          <Button variant="subtle" color="red" size="xs" leftSection={<IconTrash size={14} />} onClick={() => { onDelete(invoice.id); onClose() }}>
            삭제
          </Button>
          <Group gap="sm">
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <>
                <Button variant="light" color="teal" size="sm" leftSection={<IconCheck size={14} />} onClick={() => onPaymentConfirm(invoice)}>
                  입금 확인
                </Button>
                <Button variant="filled" size="sm" leftSection={<IconMail size={14} />} onClick={() => onSend(invoice)}>
                  이메일 발송
                </Button>
              </>
            )}
            {invoice.status === 'paid' && (
              <Button variant="light" size="sm" leftSection={<IconMail size={14} />} onClick={() => onSend(invoice)}>
                이메일 재발송
              </Button>
            )}
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}

// ==================================================
// 입금 확인 모달 (청구서용)
// ==================================================

function InvoicePaymentForm({ invoice, onSubmit, onCancel }) {
  const [amount, setAmount] = useState(String(invoice?.total || ''))
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [memo, setMemo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try { await onSubmit(invoice.id, Number(amount), date, memo) } finally { setIsSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Card padding="sm" bg="gray.0">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">청구번호</Text>
            <Text size="sm" fw={500} ff="monospace">{invoice?.invoiceNumber}</Text>
          </Group>
          <Group justify="space-between" mt={4}>
            <Text size="sm" c="dimmed">청구 금액</Text>
            <Text size="sm" fw={600} c="indigo">{formatCurrency(invoice?.total)}</Text>
          </Group>
        </Card>
        <AmountInput label="실제 입금액" required withAsterisk value={amount} onChange={setAmount} />
        <TextInput label="입금일" type="date" value={date} onChange={(e) => setDate(e.currentTarget.value)} required />
        <TextInput label="메모" placeholder="예: 국민은행 이체 확인" value={memo} onChange={(e) => setMemo(e.currentTarget.value)} />
        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onCancel}>취소</Button>
          <Button type="submit" loading={isSubmitting} color="teal" leftSection={<IconCheck size={14} />}>입금 확인 저장</Button>
        </Group>
      </Stack>
    </form>
  )
}

// ==================================================
// 섹션 ③ 청구서 이력 패널
// ==================================================

function InvoicePanel({ invoices, retainers, disbursements, cases, consultations, getItemName, onSave }) {
  const { openModal, closeModal, isModalOpen, modalType, modalData, showToast } = useUiStore()
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const handleCreate = async (formData) => {
    const newInvoices = [...invoices, { ...formData, createdAt: new Date().toISOString() }]
    await onSave('invoices', newInvoices)
    closeModal()
    showToast('청구서가 생성되었습니다.', 'success')
  }

  const handlePaymentConfirm = async (invoiceId, paidAmount, paidAt, memo) => {
    const newInvoices = invoices.map((inv) =>
      inv.id === invoiceId ? { ...inv, status: 'paid', paidAmount, paidAt, paymentMemo: memo } : inv
    )
    await onSave('invoices', newInvoices)
    closeModal()
    setDetailOpen(false)
    showToast('입금이 확인되었습니다.', 'success')
  }

  const handleSendEmail = (invoice) => {
    const caseInfo = getItemName(invoice.caseId)
    const caseObj = cases.find((c) => c.id === invoice.caseId)
    const consultObj = consultations.find((c) => c.id === invoice.caseId)
    const clientEmail = caseObj?.clientEmail || consultObj?.clientEmail || ''

    const subject = `[${caseInfo.sub || ''}] 수임료 청구서 (${formatDate(invoice.issueDate)})`
    const body = buildInvoiceEmailBody(invoice, caseInfo)

    openGmailCompose(clientEmail, subject, body)

    // 발송 상태 업데이트
    const newInvoices = invoices.map((inv) =>
      inv.id === invoice.id ? { ...inv, status: inv.status === 'draft' ? 'sent' : inv.status, sentAt: new Date().toISOString(), clientEmail } : inv
    )
    onSave('invoices', newInvoices)
    showToast('Gmail 작성 창이 열렸습니다.', 'success')
  }

  const handleDelete = async (id) => {
    if (!confirm('이 청구서를 삭제하시겠습니까?')) return
    await onSave('invoices', invoices.filter((inv) => inv.id !== id))
    showToast('청구서가 삭제되었습니다.', 'success')
  }

  const openDetail = (inv) => {
    setSelectedInvoice(inv)
    setDetailOpen(true)
  }

  const sortedInvoices = useMemo(() =>
    [...invoices].sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate)),
    [invoices]
  )

  return (
    <Stack gap="md">
      {invoices.length === 0 ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <ThemeIcon size={48} radius="xl" variant="light" color="blue"><IconFileInvoice size={24} /></ThemeIcon>
            <Text c="dimmed" size="sm">발행된 청구서가 없습니다</Text>
            <Text size="xs" c="dimmed">청구서를 발행하고 이메일로 발송할 수 있습니다.</Text>
            <Button variant="subtle" leftSection={<IconPlus size={14} />} onClick={() => openModal('createInvoice')}>
              청구서 발행
            </Button>
          </Stack>
        </Center>
      ) : (
        <Stack gap="md">
          {/* 요약 */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
            <Card padding="sm" bg="gray.0">
              <Text size="xs" c="dimmed">전체</Text>
              <Text size="lg" fw={700}>{invoices.length}건</Text>
            </Card>
            <Card padding="sm" bg="green.0">
              <Text size="xs" c="dimmed">완납</Text>
              <Text size="lg" fw={700} c="green">{invoices.filter((i) => i.status === 'paid').length}건</Text>
            </Card>
            <Card padding="sm" bg="orange.0">
              <Text size="xs" c="dimmed">미입금</Text>
              <Text size="lg" fw={700} c="orange">{invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').length}건</Text>
            </Card>
            <Card padding="sm" bg="red.0">
              <Text size="xs" c="dimmed">연체</Text>
              <Text size="lg" fw={700} c="red">{invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled' && i.dueDate && new Date(i.dueDate) < new Date()).length}건</Text>
            </Card>
          </SimpleGrid>

          {/* 청구서 목록 */}
          <Card padding={0}>
            <Table.ScrollContainer minWidth={700}>
              <Table striped={false} highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>청구번호</Table.Th>
                    <Table.Th>발행일</Table.Th>
                    <Table.Th>사건/자문</Table.Th>
                    <Table.Th>항목</Table.Th>
                    <Table.Th ta="right">금액</Table.Th>
                    <Table.Th>상태</Table.Th>
                    <Table.Th>납부기한</Table.Th>
                    <Table.Th style={{ width: 120 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sortedInvoices.map((inv) => {
                    const item = getItemName(inv.caseId)
                    const st = INVOICE_STATUSES[inv.status] || INVOICE_STATUSES.draft
                    const isOverdue = inv.status !== 'paid' && inv.status !== 'cancelled' && inv.dueDate && new Date(inv.dueDate) < new Date()
                    const itemCount = (inv.lineItems || []).length
                    const firstItem = (inv.lineItems || [])[0]?.label || ''
                    return (
                      <Table.Tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(inv)}>
                        <Table.Td><Text size="sm" ff="monospace" fw={500} c="indigo">{inv.invoiceNumber}</Text></Table.Td>
                        <Table.Td><Text size="sm">{formatDate(inv.issueDate)}</Text></Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>{item.name}</Text>
                          {item.sub && <Text size="xs" c="dimmed">{item.sub}</Text>}
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {firstItem}{itemCount > 1 ? ` 외 ${itemCount - 1}건` : ''}
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" fw={600}>{formatCurrency(inv.total)}</Text>
                          {inv.total >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(inv.total)}</Text>}
                        </Table.Td>
                        <Table.Td>
                          <Badge color={isOverdue ? 'red' : st.color} variant="light" size="sm">
                            {isOverdue ? '연체' : st.label}
                          </Badge>
                          {inv.sentAt && <Text size="xs" c="dimmed" mt={2}>발송됨</Text>}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c={isOverdue ? 'red' : 'dimmed'}>{formatDate(inv.dueDate)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <Button variant="light" size="xs" color="blue" onClick={() => handleSendEmail(inv)}>
                                발송
                              </Button>
                            )}
                            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <Button variant="light" size="xs" color="teal" onClick={() => { setSelectedInvoice(inv); openModal('invoicePayment') }}>
                                입금
                              </Button>
                            )}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        </Stack>
      )}

      {/* 청구서 상세 모달 */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        caseInfo={selectedInvoice ? getItemName(selectedInvoice.caseId) : { name: '', sub: '' }}
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedInvoice(null) }}
        onSend={handleSendEmail}
        onPaymentConfirm={(inv) => { setDetailOpen(false); setSelectedInvoice(inv); openModal('invoicePayment') }}
        onDelete={handleDelete}
      />

      {/* 청구서 생성 모달 */}
      <Modal isOpen={isModalOpen && modalType === 'createInvoice'} onClose={closeModal} title="청구서 발행">
        <InvoiceForm
          cases={cases}
          consultations={consultations}
          retainers={retainers}
          disbursements={disbursements}
          getItemName={getItemName}
          onSubmit={handleCreate}
          onCancel={closeModal}
        />
      </Modal>

      {/* 입금 확인 모달 */}
      <Modal isOpen={isModalOpen && modalType === 'invoicePayment'} onClose={closeModal} title="입금 확인">
        {selectedInvoice && (
          <InvoicePaymentForm
            invoice={selectedInvoice}
            onSubmit={handlePaymentConfirm}
            onCancel={closeModal}
          />
        )}
      </Modal>
    </Stack>
  )
}

// ==================================================
// 청구서 발행 폼
// ==================================================

function InvoiceForm({ cases, consultations, retainers, disbursements, getItemName, onSubmit, onCancel }) {
  const allItems = useMemo(() => {
    const items = []
    for (const c of cases) items.push({ value: c.id, label: `[사건] ${c.clientName} ${c.caseNumber ? `(${c.caseNumber})` : ''}` })
    for (const c of consultations) items.push({ value: c.id, label: `[자문] ${c.clientName} ${c.subject ? `— ${c.subject}` : ''}` })
    return items
  }, [cases, consultations])

  const [caseId, setCaseId] = useState('')
  const [selectedItems, setSelectedItems] = useState([])
  const [customItems, setCustomItems] = useState([])
  const [vatOption, setVatOption] = useState('excluded')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  })
  const [clientEmail, setClientEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 사건 선택 시 이메일 자동 채우기
  useEffect(() => {
    if (!caseId) return
    const c = cases.find((x) => x.id === caseId)
    const co = consultations.find((x) => x.id === caseId)
    setClientEmail(c?.clientEmail || co?.clientEmail || '')
  }, [caseId, cases, consultations])

  // 선택한 사건의 청구 가능 항목
  const availableItems = useMemo(() => {
    if (!caseId) return []
    const items = []
    const caseRetainers = retainers.filter((r) => r.caseId === caseId)
    for (const r of caseRetainers) {
      if (r.retainerFee > 0 && r.retainerPaid < r.retainerFee) {
        items.push({ key: `ret-${r.id}`, label: '착수금', amount: r.retainerFee - r.retainerPaid, note: '미입금 잔액' })
      }
      if (r.contingencyFee > 0 && r.contingencyPaid < r.contingencyFee) {
        items.push({ key: `cont-${r.id}`, label: '성공보수', amount: r.contingencyFee - r.contingencyPaid, note: r.contingencyNote || '' })
      }
    }
    const caseDisbursements = disbursements.filter((d) => d.caseId === caseId && d.billable && !d.billed)
    for (const d of caseDisbursements) {
      items.push({ key: `disb-${d.id}`, label: `실비 — ${d.category}`, amount: d.amount, note: d.description || '' })
    }
    return items
  }, [caseId, retainers, disbursements])

  const toggleItem = (key) => {
    setSelectedItems((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])
  }

  // 커스텀 항목 추가/삭제
  const addCustomItem = () => {
    setCustomItems([...customItems, { id: `custom-${Date.now()}`, label: '', amount: '', note: '' }])
  }
  const updateCustomItem = (id, field, value) => {
    setCustomItems(customItems.map((ci) => ci.id === id ? { ...ci, [field]: value } : ci))
  }
  const removeCustomItem = (id) => {
    setCustomItems(customItems.filter((ci) => ci.id !== id))
  }

  // 합계 계산
  const selectedTotal = availableItems.filter((i) => selectedItems.includes(i.key)).reduce((s, i) => s + i.amount, 0)
  const customTotal = customItems.reduce((s, ci) => s + (Number(ci.amount) || 0), 0)
  const subtotal = selectedTotal + customTotal
  const vatAmount = vatOption === 'excluded' ? Math.round(subtotal * 0.1) : vatOption === 'included' ? Math.round(subtotal - subtotal / 1.1) : 0
  const total = vatOption === 'excluded' ? subtotal + vatAmount : subtotal

  const hasItems = selectedItems.length > 0 || customItems.some((ci) => ci.label && ci.amount)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!caseId || !hasItems) return
    setIsSubmitting(true)

    const now = new Date()
    const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`
    const item = getItemName(caseId)

    const lineItems = [
      ...availableItems.filter((i) => selectedItems.includes(i.key)).map((i) => ({ label: i.label, amount: i.amount, note: i.note })),
      ...customItems.filter((ci) => ci.label && ci.amount).map((ci) => ({ label: ci.label, amount: Number(ci.amount), note: ci.note })),
    ]

    try {
      await onSubmit({
        id: `inv-${Date.now()}`,
        caseId,
        invoiceNumber,
        type: 'mixed',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate,
        clientName: item.name,
        clientEmail,
        lineItems,
        subtotal,
        vatAmount,
        total,
        status: 'draft',
        sentAt: null,
        paidAt: null,
        paidAmount: 0,
        memo: '',
      })
    } finally { setIsSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Select label="사건 / 자문" placeholder="선택하세요" data={allItems} value={caseId} onChange={(v) => { setCaseId(v); setSelectedItems([]); setCustomItems([]) }} searchable required withAsterisk />

        {caseId && (
          <TextInput label="의뢰인 이메일" placeholder="client@example.com" value={clientEmail} onChange={(e) => setClientEmail(e.currentTarget.value)} />
        )}

        {/* 등록된 항목에서 선택 */}
        {caseId && availableItems.length > 0 && (
          <>
            <Text size="sm" fw={500} mt="xs">등록된 항목에서 선택</Text>
            <Stack gap={6}>
              {availableItems.map((item) => (
                <Card key={item.key} padding="xs" withBorder style={{ cursor: 'pointer', backgroundColor: selectedItems.includes(item.key) ? 'var(--mantine-color-indigo-0)' : undefined }} onClick={() => toggleItem(item.key)}>
                  <Group justify="space-between">
                    <Group gap="sm">
                      <Checkbox checked={selectedItems.includes(item.key)} onChange={() => toggleItem(item.key)} onClick={(e) => e.stopPropagation()} />
                      <Box>
                        <Text size="sm" fw={500}>{item.label}</Text>
                        {item.note && <Text size="xs" c="dimmed">{item.note}</Text>}
                      </Box>
                    </Group>
                    <Text size="sm" fw={600}>{formatCurrency(item.amount)}</Text>
                  </Group>
                </Card>
              ))}
            </Stack>
          </>
        )}

        {/* 직접 항목 추가 */}
        {caseId && (
          <>
            <Divider label="직접 항목 추가" labelPosition="left" />
            {customItems.map((ci) => (
              <Card key={ci.id} padding="xs" withBorder>
                <Group gap="xs" align="flex-end">
                  <TextInput placeholder="항목명" value={ci.label} onChange={(e) => updateCustomItem(ci.id, 'label', e.currentTarget.value)} style={{ flex: 2 }} size="sm" />
                  <TextInput placeholder="금액" value={ci.amount ? formatWithCommas(String(ci.amount)) : ''} onChange={(e) => updateCustomItem(ci.id, 'amount', stripNonDigits(e.currentTarget.value))} style={{ flex: 1 }} size="sm" />
                  <TextInput placeholder="비고" value={ci.note} onChange={(e) => updateCustomItem(ci.id, 'note', e.currentTarget.value)} style={{ flex: 1 }} size="sm" />
                  <UnstyledButton onClick={() => removeCustomItem(ci.id)}>
                    <IconX size={16} color="var(--mantine-color-red-5)" />
                  </UnstyledButton>
                </Group>
              </Card>
            ))}
            <Button variant="subtle" size="xs" leftSection={<IconPlus size={14} />} onClick={addCustomItem}>
              항목 추가
            </Button>
          </>
        )}

        {/* 합계 */}
        {caseId && hasItems && (
          <>
            <Divider />
            <Radio.Group label="부가세" value={vatOption} onChange={setVatOption}>
              <Group gap="lg" mt={4}>
                <Radio value="excluded" label="별도" />
                <Radio value="included" label="포함" />
                <Radio value="exempt" label="면세" />
              </Group>
            </Radio.Group>

            <TextInput label="납부기한" type="date" value={dueDate} onChange={(e) => setDueDate(e.currentTarget.value)} />

            <Card padding="sm" bg="gray.0">
              <Group justify="space-between">
                <Text size="sm">소계</Text>
                <Text size="sm" fw={500}>{formatCurrency(subtotal)}</Text>
              </Group>
              {vatOption !== 'exempt' && (
                <Group justify="space-between" mt={4}>
                  <Text size="sm">부가세 (10%)</Text>
                  <Text size="sm" fw={500}>{formatCurrency(vatAmount)}</Text>
                </Group>
              )}
              <Divider my="xs" />
              <Group justify="space-between">
                <Text size="sm" fw={700}>합계</Text>
                <Text size="lg" fw={700} c="indigo">{formatCurrency(total)}</Text>
              </Group>
              {total >= 10000 && <Text size="xs" c="dimmed" ta="right">{numberToKorean(total)}</Text>}
            </Card>
          </>
        )}

        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onCancel}>취소</Button>
          <Button type="submit" loading={isSubmitting} disabled={!caseId || !hasItems} leftSection={<IconFileInvoice size={14} />}>청구서 생성</Button>
        </Group>
      </Stack>
    </form>
  )
}

// ==================================================
// 통계 패널
// ==================================================

function StatsPanel({ retainers, disbursements, invoices }) {
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()
  const lastYear = thisYear - 1

  // 월별 수임료 (retainer 입금 기준)
  function getMonthlyRetainerIncome(year) {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: MONTH_NAMES[i], amount: 0 }))
    for (const r of retainers) {
      if (r.retainerPaidAt) {
        const d = new Date(r.retainerPaidAt)
        if (d.getFullYear() === year) months[d.getMonth()].amount += (r.retainerPaid || 0)
      }
      if (r.contingencyPaidAt) {
        const d = new Date(r.contingencyPaidAt)
        if (d.getFullYear() === year) months[d.getMonth()].amount += (r.contingencyPaid || 0)
      }
    }
    return months
  }

  // 월별 실비
  function getMonthlyDisbursement(year) {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: MONTH_NAMES[i], amount: 0 }))
    for (const d of disbursements) {
      if (!d.date) continue
      const dt = new Date(d.date)
      if (dt.getFullYear() === year) months[dt.getMonth()].amount += (d.amount || 0)
    }
    return months
  }

  // 연간 합계
  function yearTotal(arr, yearVal) {
    return arr.filter((_, i) => true).reduce((s, d) => s + d.amount, 0)
  }

  const thisYearIncome = getMonthlyRetainerIncome(thisYear)
  const lastYearIncome = getMonthlyRetainerIncome(lastYear)
  const thisYearExpense = getMonthlyDisbursement(thisYear)
  const lastYearExpense = getMonthlyDisbursement(lastYear)

  const thisYearIncomeTotal = thisYearIncome.reduce((s, d) => s + d.amount, 0)
  const lastYearIncomeTotal = lastYearIncome.reduce((s, d) => s + d.amount, 0)
  const thisYearExpenseTotal = thisYearExpense.reduce((s, d) => s + d.amount, 0)
  const lastYearExpenseTotal = lastYearExpense.reduce((s, d) => s + d.amount, 0)

  // 이번 달
  const thisMonthIncome = thisYearIncome[thisMonth]?.amount || 0
  const lastMonthIncome = thisMonth > 0 ? (thisYearIncome[thisMonth - 1]?.amount || 0) : 0
  const lastYearSameMonthIncome = lastYearIncome[thisMonth]?.amount || 0
  const thisMonthExpense = thisYearExpense[thisMonth]?.amount || 0

  // 청구서 통계
  const paidInvoices = invoices.filter((i) => i.status === 'paid').length
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').length
  const overdueInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled' && i.dueDate && new Date(i.dueDate) < new Date()).length

  const allIncomeMax = Math.max(...thisYearIncome.map((d) => d.amount), ...lastYearIncome.map((d) => d.amount), 1)

  return (
    <Stack gap="lg">
      {/* 이번 달 요약 */}
      <Card padding="lg">
        <Group gap="xs" mb="md">
          <ThemeIcon size={24} variant="light" color="indigo" radius="xl"><IconCalendarStats size={14} /></ThemeIcon>
          <Text fw={600}>{thisYear}년 {thisMonth + 1}월 요약</Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Card padding="md" bg="indigo.0">
            <Text size="xs" c="dimmed" mb={4}>이번 달 수임료 입금</Text>
            <Text size="lg" fw={700} c="indigo">{formatCurrency(thisMonthIncome)}</Text>
            {thisMonthIncome >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(thisMonthIncome)}</Text>}
            <Group gap={6} mt="xs">
              <Text size="xs" c="dimmed">지난달 대비</Text>
              <ChangeBadge current={thisMonthIncome} previous={lastMonthIncome} />
            </Group>
            <Group gap={6} mt={4}>
              <Text size="xs" c="dimmed">작년 같은 달</Text>
              <ChangeBadge current={thisMonthIncome} previous={lastYearSameMonthIncome} />
            </Group>
          </Card>
          <Card padding="md" bg="orange.0">
            <Text size="xs" c="dimmed" mb={4}>이번 달 실비</Text>
            <Text size="lg" fw={700} c="orange">{formatCurrency(thisMonthExpense)}</Text>
            {thisMonthExpense >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(thisMonthExpense)}</Text>}
          </Card>
          <Card padding="md" bg="blue.0">
            <Text size="xs" c="dimmed" mb={4}>청구서 현황</Text>
            <Group gap="lg">
              <Box>
                <Text size="lg" fw={700} c="green">{paidInvoices}</Text>
                <Text size="xs" c="dimmed">완납</Text>
              </Box>
              <Box>
                <Text size="lg" fw={700} c="orange">{unpaidInvoices}</Text>
                <Text size="xs" c="dimmed">미입금</Text>
              </Box>
              {overdueInvoices > 0 && (
                <Box>
                  <Text size="lg" fw={700} c="red">{overdueInvoices}</Text>
                  <Text size="xs" c="dimmed">연체</Text>
                </Box>
              )}
            </Group>
          </Card>
        </SimpleGrid>
      </Card>

      {/* 연간 수임료 비교 */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card padding="lg">
          <Group justify="space-between" mb="md">
            <Text fw={600}>수임료 입금 월별 추이</Text>
            <Badge variant="light" color="indigo" size="sm">{thisYear}</Badge>
          </Group>
          <BarChart data={thisYearIncome} maxValue={allIncomeMax} color="indigo" labelKey="month" valueKey="amount" />
          <Divider my="sm" />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{thisYear}년 합계</Text>
            <Group gap="xs">
              <Text size="sm" fw={600} c="indigo">{formatCurrency(thisYearIncomeTotal)}</Text>
              <ChangeBadge current={thisYearIncomeTotal} previous={lastYearIncomeTotal} />
            </Group>
          </Group>
        </Card>

        <Card padding="lg">
          <Group justify="space-between" mb="md">
            <Text fw={600}>작년 수임료 비교</Text>
            <Badge variant="light" color="gray" size="sm">{lastYear}</Badge>
          </Group>
          <BarChart data={lastYearIncome} maxValue={allIncomeMax} color="gray" labelKey="month" valueKey="amount" />
          <Divider my="sm" />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{lastYear}년 합계</Text>
            <Text size="sm" fw={600}>{formatCurrency(lastYearIncomeTotal)}</Text>
          </Group>
        </Card>
      </SimpleGrid>

      {/* 실비 + 연간 요약 */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card padding="lg">
          <Group justify="space-between" mb="md">
            <Text fw={600}>실비 월별</Text>
            <Badge variant="light" color="orange" size="sm">{thisYear}</Badge>
          </Group>
          <BarChart data={thisYearExpense} color="orange" labelKey="month" valueKey="amount" />
          <Divider my="sm" />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{thisYear}년 합계</Text>
            <Group gap="xs">
              <Text size="sm" fw={600} c="orange">{formatCurrency(thisYearExpenseTotal)}</Text>
              <ChangeBadge current={thisYearExpenseTotal} previous={lastYearExpenseTotal} />
            </Group>
          </Group>
        </Card>

        <Card padding="lg">
          <Text fw={600} mb="md">연간 요약 비교</Text>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>항목</Table.Th>
                <Table.Th ta="right">{thisYear}</Table.Th>
                <Table.Th ta="right">{lastYear}</Table.Th>
                <Table.Th ta="right">변화</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td><Text size="sm" fw={500}>수임료 입금</Text></Table.Td>
                <Table.Td ta="right"><Text size="sm" fw={600} c="indigo">{formatCurrencyShort(thisYearIncomeTotal)}</Text></Table.Td>
                <Table.Td ta="right"><Text size="sm" c="dimmed">{formatCurrencyShort(lastYearIncomeTotal)}</Text></Table.Td>
                <Table.Td ta="right"><ChangeBadge current={thisYearIncomeTotal} previous={lastYearIncomeTotal} /></Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td><Text size="sm" fw={500}>실비</Text></Table.Td>
                <Table.Td ta="right"><Text size="sm" fw={600} c="orange">{formatCurrencyShort(thisYearExpenseTotal)}</Text></Table.Td>
                <Table.Td ta="right"><Text size="sm" c="dimmed">{formatCurrencyShort(lastYearExpenseTotal)}</Text></Table.Td>
                <Table.Td ta="right"><ChangeBadge current={thisYearExpenseTotal} previous={lastYearExpenseTotal} /></Table.Td>
              </Table.Tr>
              <Table.Tr style={{ borderTop: '2px solid var(--mantine-color-gray-3)' }}>
                <Table.Td><Text size="sm" fw={700}>순수익</Text></Table.Td>
                <Table.Td ta="right">
                  <Text size="sm" fw={700} c={thisYearIncomeTotal - thisYearExpenseTotal >= 0 ? 'blue' : 'red'}>
                    {formatCurrencyShort(thisYearIncomeTotal - thisYearExpenseTotal)}
                  </Text>
                </Table.Td>
                <Table.Td ta="right"><Text size="sm" c="dimmed">{formatCurrencyShort(lastYearIncomeTotal - lastYearExpenseTotal)}</Text></Table.Td>
                <Table.Td ta="right">
                  <ChangeBadge current={thisYearIncomeTotal - thisYearExpenseTotal} previous={lastYearIncomeTotal - lastYearExpenseTotal} />
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>
    </Stack>
  )
}

// ==================================================
// 메인 Billing 컴포넌트
// ==================================================

export default function Billing() {
  const navigate = useNavigate()
  const { cases, consultations, casesFileId } = useCaseStore()
  const { showToast, isModalOpen, modalType, openModal, closeModal } = useUiStore()
  const [retainers, setRetainers] = useState([])
  const [disbursements, setDisbursements] = useState([])
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('retainers')

  useEffect(() => {
    if (!casesFileId) return
    setIsLoading(true)
    readCasesIndex(casesFileId).then((data) => {
      setRetainers(data.retainers || [])
      setDisbursements(data.disbursements || [])
      setInvoices(data.invoices || [])
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [casesFileId])

  const saveData = async (key, newData) => {
    if (!casesFileId) return
    const data = await readCasesIndex(casesFileId)
    data[key] = newData
    await writeCasesIndex(casesFileId, data)
    if (key === 'retainers') setRetainers(newData)
    else if (key === 'disbursements') setDisbursements(newData)
    else if (key === 'invoices') setInvoices(newData)
  }

  const getItemName = (caseId) => {
    const c = cases.find((x) => x.id === caseId)
    if (c) return { name: c.clientName, sub: c.caseNumber, category: 'case' }
    const co = consultations.find((x) => x.id === caseId)
    if (co) return { name: co.clientName, sub: co.subject, category: 'consultation' }
    return { name: caseId, sub: '', category: 'unknown' }
  }

  // 전체 요약 통계
  const totalRetainerFee = retainers.reduce((s, r) => s + (r.retainerFee || 0) + (r.contingencyFee || 0), 0)
  const totalRetainerPaid = retainers.reduce((s, r) => s + (r.retainerPaid || 0) + (r.contingencyPaid || 0), 0)
  const totalDisbursement = disbursements.reduce((s, d) => s + (d.amount || 0), 0)
  const unpaidInvoiceTotal = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + (i.total || 0), 0)

  const tabButton = activeTab === 'retainers'
    ? { label: '수임 계약 등록', action: () => openModal('createRetainer') }
    : activeTab === 'disbursements'
    ? { label: '실비 추가', action: () => openModal('createDisbursement') }
    : activeTab === 'invoices'
    ? { label: '청구서 발행', action: () => openModal('createInvoice') }
    : null

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        {/* 헤더 */}
        <Group justify="space-between">
          <Group gap="xs">
            <IconReceipt size={22} color="var(--mantine-color-teal-6)" />
            <Text size="lg" fw={700}>비용 관리</Text>
          </Group>
          {tabButton && (
            <Button leftSection={<IconPlus size={16} />} onClick={tabButton.action}>
              {tabButton.label}
            </Button>
          )}
        </Group>

        {isLoading && (
          <Center py="xl">
            <Stack align="center" gap="sm">
              <Loader size="md" color="indigo" />
              <Text size="sm" c="dimmed">데이터 불러오는 중...</Text>
            </Stack>
          </Center>
        )}

        {!isLoading && (
          <>
            {/* 전체 요약 카드 */}
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
              <Card padding="md">
                <Group gap="xs" mb={4}>
                  <ThemeIcon size={20} variant="light" color="indigo" radius="xl"><IconContract size={10} /></ThemeIcon>
                  <Text size="xs" c="dimmed">수임료 총액</Text>
                </Group>
                <Text size="lg" fw={700} c="indigo">{formatCurrencyShort(totalRetainerFee)}</Text>
                {totalRetainerFee >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(totalRetainerFee)}</Text>}
              </Card>
              <Card padding="md">
                <Group gap="xs" mb={4}>
                  <ThemeIcon size={20} variant="light" color="teal" radius="xl"><IconCash size={10} /></ThemeIcon>
                  <Text size="xs" c="dimmed">입금 완료</Text>
                </Group>
                <Text size="lg" fw={700} c="teal">{formatCurrencyShort(totalRetainerPaid)}</Text>
                {totalRetainerPaid >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(totalRetainerPaid)}</Text>}
              </Card>
              <Card padding="md">
                <Group gap="xs" mb={4}>
                  <ThemeIcon size={20} variant="light" color="orange" radius="xl"><IconCoin size={10} /></ThemeIcon>
                  <Text size="xs" c="dimmed">실비 지출</Text>
                </Group>
                <Text size="lg" fw={700} c="orange">{formatCurrencyShort(totalDisbursement)}</Text>
                {totalDisbursement >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(totalDisbursement)}</Text>}
              </Card>
              <Card padding="md">
                <Group gap="xs" mb={4}>
                  <ThemeIcon size={20} variant="light" color={unpaidInvoiceTotal > 0 ? 'red' : 'green'} radius="xl">
                    <IconAlertCircle size={10} />
                  </ThemeIcon>
                  <Text size="xs" c="dimmed">미수금</Text>
                </Group>
                <Text size="lg" fw={700} c={unpaidInvoiceTotal > 0 ? 'red' : 'green'}>{formatCurrencyShort(unpaidInvoiceTotal)}</Text>
              </Card>
            </SimpleGrid>

            {/* 탭 */}
            <Tabs value={activeTab} onChange={setActiveTab}>
              <Tabs.List>
                <Tabs.Tab value="retainers" leftSection={<IconContract size={16} />}>
                  수임 계약
                  {retainers.length > 0 && <Badge size="xs" variant="light" color="indigo" ml={6}>{retainers.length}</Badge>}
                </Tabs.Tab>
                <Tabs.Tab value="disbursements" leftSection={<IconCoin size={16} />}>
                  실비 내역
                  {disbursements.length > 0 && <Badge size="xs" variant="light" color="orange" ml={6}>{disbursements.length}</Badge>}
                </Tabs.Tab>
                <Tabs.Tab value="invoices" leftSection={<IconFileInvoice size={16} />}>
                  청구서
                  {invoices.length > 0 && <Badge size="xs" variant="light" color="blue" ml={6}>{invoices.length}</Badge>}
                </Tabs.Tab>
                <Tabs.Tab value="stats" leftSection={<IconChartBar size={16} />}>통계 분석</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="retainers" pt="md">
                <RetainerPanel
                  retainers={retainers}
                  cases={cases}
                  consultations={consultations}
                  getItemName={getItemName}
                  onSave={saveData}
                />
              </Tabs.Panel>

              <Tabs.Panel value="disbursements" pt="md">
                <DisbursementPanel
                  disbursements={disbursements}
                  cases={cases}
                  consultations={consultations}
                  getItemName={getItemName}
                  onSave={saveData}
                />
              </Tabs.Panel>

              <Tabs.Panel value="invoices" pt="md">
                <InvoicePanel
                  invoices={invoices}
                  retainers={retainers}
                  disbursements={disbursements}
                  cases={cases}
                  consultations={consultations}
                  getItemName={getItemName}
                  onSave={saveData}
                />
              </Tabs.Panel>

              <Tabs.Panel value="stats" pt="md">
                <StatsPanel retainers={retainers} disbursements={disbursements} invoices={invoices} />
              </Tabs.Panel>
            </Tabs>
          </>
        )}
      </Stack>
    </Container>
  )
}
