import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Group, Text, Button, Card,
  SimpleGrid, Stack, Box, Container, UnstyledButton,
  TextInput, Select, Badge, Alert, Textarea,
  Table, ThemeIcon, Center, Loader, Collapse,
  SegmentedControl, Divider, Progress, Tabs,
} from '@mantine/core'
import {
  IconPlus, IconReceipt,
  IconCash, IconCreditCard, IconTrash, IconEdit,
  IconSearch, IconChartBar, IconCheck, IconX,
  IconChevronDown, IconChevronUp, IconTrendingUp,
  IconTrendingDown, IconCalendarStats, IconArrowUpRight,
  IconArrowDownRight, IconMinus,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import { readCasesIndex, writeCasesIndex } from '../api/drive'
import Modal from '../components/ui/Modal'

// --- 금액 포맷 유틸리티 ---

function numberToKorean(num) {
  if (!num && num !== 0) return ''
  const n = Math.abs(Number(num))
  if (isNaN(n) || n === 0) return '0\uC6D0'

  const eok = Math.floor(n / 100000000)
  const man = Math.floor((n % 100000000) / 10000)
  const rest = n % 10000

  const parts = []
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}\uC5B5`)
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}\uB9CC`)
  if (rest > 0) parts.push(`${rest.toLocaleString('ko-KR')}`)

  return parts.join(' ') + '\uC6D0'
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '-'
  return Number(amount).toLocaleString('ko-KR') + '\uC6D0'
}

function formatCurrencyShort(amount) {
  if (!amount && amount !== 0) return '0'
  const n = Math.abs(Number(amount))
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}\uC5B5`
  if (n >= 10000) return `${Math.round(n / 10000)}\uB9CC`
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

const MONTH_NAMES = ['1\uC6D4', '2\uC6D4', '3\uC6D4', '4\uC6D4', '5\uC6D4', '6\uC6D4', '7\uC6D4', '8\uC6D4', '9\uC6D4', '10\uC6D4', '11\uC6D4', '12\uC6D4']

const PAYMENT_TYPES = [
  { value: 'fee', label: '\uC218\uC784\uB8CC' },
  { value: 'expense', label: '\uC2E4\uBE44' },
  { value: 'deposit', label: '\uC785\uAE08' },
  { value: 'refund', label: '\uD658\uBD88' },
]

const PAYMENT_METHODS = [
  { value: 'bank', label: '\uACC4\uC88C\uC774\uCCB4' },
  { value: 'card', label: '\uCE74\uB4DC' },
  { value: 'cash', label: '\uD604\uAE08' },
  { value: 'other', label: '\uAE30\uD0C0' },
]

const TYPE_CONFIG = {
  fee: { label: '\uC218\uC784\uB8CC', color: 'indigo' },
  expense: { label: '\uC2E4\uBE44', color: 'orange' },
  deposit: { label: '\uC785\uAE08', color: 'teal' },
  refund: { label: '\uD658\uBD88', color: 'red' },
}

// --- 금액 입력 컴포넌트 ---

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
      {koreanText && (
        <Text size="xs" c="indigo" mt={2} fw={500}>{koreanText}</Text>
      )}
    </Box>
  )
}

// --- 비용 폼 ---

function BillingForm({ cases, consultations, initialData, onSubmit, onCancel }) {
  const isEditing = !!initialData
  const allItems = useMemo(() => {
    const items = []
    for (const c of cases) {
      items.push({ value: c.id, label: `[\uC0AC\uAC74] ${c.clientName} ${c.caseNumber ? `(${c.caseNumber})` : ''}` })
    }
    for (const c of consultations) {
      items.push({ value: c.id, label: `[\uC790\uBB38] ${c.clientName} ${c.subject ? `\u2014 ${c.subject}` : ''}` })
    }
    return items
  }, [cases, consultations])

  const [form, setForm] = useState({
    caseId: initialData?.caseId || '',
    type: initialData?.type || 'fee',
    amount: initialData?.amount ? String(initialData.amount) : '',
    method: initialData?.method || 'bank',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    note: initialData?.note || '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (name, value) => setForm({ ...form, [name]: value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.caseId || !form.amount) return
    setIsSubmitting(true)
    try {
      await onSubmit({ ...form, amount: Number(form.amount), id: isEditing ? initialData.id : `bill-${Date.now()}` })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Select label={'\uC0AC\uAC74 / \uC790\uBB38'} placeholder={'\uC120\uD0DD\uD558\uC138\uC694'} data={allItems} value={form.caseId} onChange={(val) => handleChange('caseId', val)} searchable required withAsterisk />
        <SimpleGrid cols={2}>
          <Select label={'\uC720\uD615'} data={PAYMENT_TYPES} value={form.type} onChange={(val) => handleChange('type', val)} />
          <AmountInput label={'\uAE08\uC561'} required withAsterisk value={form.amount} onChange={(val) => handleChange('amount', val)} />
        </SimpleGrid>
        <SimpleGrid cols={2}>
          <Select label={'\uACB0\uC81C \uBC29\uBC95'} data={PAYMENT_METHODS} value={form.method} onChange={(val) => handleChange('method', val)} />
          <TextInput label={'\uB0A0\uC9DC'} type="date" value={form.date} onChange={(e) => handleChange('date', e.currentTarget.value)} />
        </SimpleGrid>
        <TextInput label={'\uBA54\uBAA8'} placeholder={'\uCC29\uC218\uAE08, \uC131\uACF5\uBCF4\uC218, \uC778\uC9C0\uB300 \uB4F1'} value={form.note} onChange={(e) => handleChange('note', e.currentTarget.value)} />
        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onCancel} leftSection={<IconX size={14} />}>{'\uCDE8\uC18C'}</Button>
          <Button type="submit" loading={isSubmitting} disabled={!form.caseId || !form.amount} leftSection={<IconCheck size={14} />}>{isEditing ? '\uC218\uC815' : '\uB4F1\uB85D'}</Button>
        </Group>
      </Stack>
    </form>
  )
}

// --- 비용 행 ---

function BillingRow({ bill, getItemName, navigate, onEdit, onDelete, isExpanded, onToggle, cases, consultations }) {
  const item = getItemName(bill.caseId)
  const tc = TYPE_CONFIG[bill.type] || { label: bill.type, color: 'gray' }
  const methodLabel = PAYMENT_METHODS.find((m) => m.value === bill.method)?.label || bill.method

  return (
    <>
      <Table.Tr style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'var(--mantine-color-indigo-0)' : undefined }} onClick={onToggle}>
        <Table.Td><Text size="sm" ff="monospace">{formatDate(bill.date)}</Text></Table.Td>
        <Table.Td><Badge color={tc.color} variant="light" size="sm">{tc.label}</Badge></Table.Td>
        <Table.Td>
          <UnstyledButton onClick={(e) => {
            e.stopPropagation()
            if (item.category === 'consultation') navigate(`/consultation/${bill.caseId}`)
            else if (item.category === 'case') navigate(`/case/${bill.caseId}`)
          }}>
            <Text size="sm" fw={500} td="underline" c="indigo">{item.name}</Text>
            {item.sub && <Text size="xs" c="dimmed">{item.sub}</Text>}
          </UnstyledButton>
        </Table.Td>
        <Table.Td>
          <Stack gap={0}>
            <Text size="sm" fw={600} c={bill.type === 'deposit' ? 'teal' : bill.type === 'refund' ? 'red' : undefined}>
              {bill.type === 'deposit' ? '+' : bill.type === 'refund' ? '-' : ''}{formatCurrency(bill.amount)}
            </Text>
            {bill.amount >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(bill.amount)}</Text>}
          </Stack>
        </Table.Td>
        <Table.Td><Text size="xs" c="dimmed">{methodLabel}</Text></Table.Td>
        <Table.Td><Text size="xs" c="dimmed" truncate style={{ maxWidth: 200 }}>{bill.note || '-'}</Text></Table.Td>
        <Table.Td>{isExpanded ? <IconChevronUp size={14} color="gray" /> : <IconChevronDown size={14} color="gray" />}</Table.Td>
      </Table.Tr>
      {isExpanded && (
        <Table.Tr>
          <Table.Td colSpan={7} style={{ backgroundColor: 'var(--mantine-color-gray-0)', padding: 0 }}>
            <Box p="md">
              <BillingForm cases={cases} consultations={consultations} initialData={bill} onSubmit={onEdit} onCancel={onToggle} />
              <Group justify="flex-start" mt="sm">
                <Button variant="subtle" color="red" size="xs" leftSection={<IconTrash size={14} />} onClick={(e) => { e.stopPropagation(); onDelete(bill.id) }}>
                  {'\uC774 \uBE44\uC6A9 \uC0AD\uC81C'}
                </Button>
              </Group>
            </Box>
          </Table.Td>
        </Table.Tr>
      )}
    </>
  )
}

// --- 비율 변화 뱃지 ---

function ChangeBadge({ current, previous }) {
  if (!previous || previous === 0) {
    if (current > 0) return <Badge size="xs" variant="light" color="teal" leftSection={<IconArrowUpRight size={10} />}>{'\uC2E0\uADDC'}</Badge>
    return null
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return <Badge size="xs" variant="light" color="gray" leftSection={<IconMinus size={10} />}>{'\uB3D9\uC77C'}</Badge>
  const isUp = pct > 0
  return (
    <Badge
      size="xs"
      variant="light"
      color={isUp ? 'teal' : 'red'}
      leftSection={isUp ? <IconArrowUpRight size={10} /> : <IconArrowDownRight size={10} />}
    >
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

// --- 통계 패널 ---

function StatsPanel({ billings }) {
  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth()
  const lastYear = thisYear - 1

  // 월별 집계 함수
  function getMonthlyData(year, type) {
    const months = Array.from({ length: 12 }, (_, i) => ({ month: MONTH_NAMES[i], amount: 0 }))
    for (const b of billings) {
      if (!b.date) continue
      const d = new Date(b.date)
      if (d.getFullYear() === year && (!type || b.type === type)) {
        months[d.getMonth()].amount += (b.amount || 0)
      }
    }
    return months
  }

  // 연간 합계
  function getYearTotal(year, type) {
    return billings
      .filter((b) => b.date && new Date(b.date).getFullYear() === year && (!type || b.type === type))
      .reduce((s, b) => s + (b.amount || 0), 0)
  }

  // 이번 달
  function getMonthTotal(year, month, type) {
    return billings
      .filter((b) => {
        if (!b.date) return false
        const d = new Date(b.date)
        return d.getFullYear() === year && d.getMonth() === month && (!type || b.type === type)
      })
      .reduce((s, b) => s + (b.amount || 0), 0)
  }

  // 올해 수임료 월별
  const thisYearFee = getMonthlyData(thisYear, 'fee')
  const lastYearFee = getMonthlyData(lastYear, 'fee')

  // 올해 실비 월별
  const thisYearExpense = getMonthlyData(thisYear, 'expense')

  // 연간 합계
  const thisYearFeeTotal = getYearTotal(thisYear, 'fee')
  const lastYearFeeTotal = getYearTotal(lastYear, 'fee')
  const thisYearExpenseTotal = getYearTotal(thisYear, 'expense')
  const lastYearExpenseTotal = getYearTotal(lastYear, 'expense')
  const thisYearDepositTotal = getYearTotal(thisYear, 'deposit')
  const lastYearDepositTotal = getYearTotal(lastYear, 'deposit')

  // 이번 달 / 지난 달 / 작년 같은 달
  const thisMonthFee = getMonthTotal(thisYear, thisMonth, 'fee')
  const lastMonthFee = getMonthTotal(thisYear, thisMonth - 1 >= 0 ? thisMonth - 1 : 11, 'fee')
  const lastYearSameMonthFee = getMonthTotal(lastYear, thisMonth, 'fee')

  const thisMonthDeposit = getMonthTotal(thisYear, thisMonth, 'deposit')
  const thisMonthExpense = getMonthTotal(thisYear, thisMonth, 'expense')

  // 차트 max
  const allFeeMax = Math.max(...thisYearFee.map((d) => d.amount), ...lastYearFee.map((d) => d.amount), 1)

  // 사건별 수임료 순위 (올해)
  const caseRanking = useMemo(() => {
    const map = {}
    for (const b of billings) {
      if (!b.date || b.type !== 'fee') continue
      const d = new Date(b.date)
      if (d.getFullYear() !== thisYear) continue
      map[b.caseId] = (map[b.caseId] || 0) + (b.amount || 0)
    }
    return Object.entries(map)
      .map(([caseId, amount]) => ({ caseId, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [billings, thisYear])

  return (
    <Stack gap="lg">
      {/* 이번 달 요약 */}
      <Card padding="lg">
        <Group gap="xs" mb="md">
          <ThemeIcon size={24} variant="light" color="indigo" radius="xl">
            <IconCalendarStats size={14} />
          </ThemeIcon>
          <Text fw={600}>{thisYear}{'\uB144'} {thisMonth + 1}{'\uC6D4 \uC694\uC57D'}</Text>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Card padding="md" bg="indigo.0">
            <Text size="xs" c="dimmed" mb={4}>{'\uC774\uBC88 \uB2EC \uC218\uC784\uB8CC'}</Text>
            <Text size="lg" fw={700} c="indigo">{formatCurrency(thisMonthFee)}</Text>
            {thisMonthFee >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(thisMonthFee)}</Text>}
            <Group gap={6} mt="xs">
              <Text size="xs" c="dimmed">{'\uC9C0\uB09C\uB2EC \uB300\uBE44'}</Text>
              <ChangeBadge current={thisMonthFee} previous={lastMonthFee} />
            </Group>
            <Group gap={6} mt={4}>
              <Text size="xs" c="dimmed">{'\uC791\uB144 \uAC19\uC740 \uB2EC'}</Text>
              <ChangeBadge current={thisMonthFee} previous={lastYearSameMonthFee} />
            </Group>
          </Card>
          <Card padding="md" bg="teal.0">
            <Text size="xs" c="dimmed" mb={4}>{'\uC774\uBC88 \uB2EC \uC785\uAE08'}</Text>
            <Text size="lg" fw={700} c="teal">{formatCurrency(thisMonthDeposit)}</Text>
            {thisMonthDeposit >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(thisMonthDeposit)}</Text>}
          </Card>
          <Card padding="md" bg="orange.0">
            <Text size="xs" c="dimmed" mb={4}>{'\uC774\uBC88 \uB2EC \uC2E4\uBE44'}</Text>
            <Text size="lg" fw={700} c="orange">{formatCurrency(thisMonthExpense)}</Text>
            {thisMonthExpense >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(thisMonthExpense)}</Text>}
          </Card>
        </SimpleGrid>
      </Card>

      {/* 연간 비교 */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* 올해 vs 작년 수임료 */}
        <Card padding="lg">
          <Group justify="space-between" mb="md">
            <Text fw={600}>{'\uC218\uC784\uB8CC \uC6D4\uBCC4 \uCD94\uC774'}</Text>
            <Badge variant="light" color="indigo" size="sm">{thisYear}</Badge>
          </Group>
          <BarChart data={thisYearFee} maxValue={allFeeMax} color="indigo" labelKey="month" valueKey="amount" />
          <Divider my="sm" />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{thisYear}{'\uB144 \uD569\uACC4'}</Text>
            <Group gap="xs">
              <Text size="sm" fw={600} c="indigo">{formatCurrency(thisYearFeeTotal)}</Text>
              <ChangeBadge current={thisYearFeeTotal} previous={lastYearFeeTotal} />
            </Group>
          </Group>
          <Group justify="space-between" mt={4}>
            <Text size="xs" c="dimmed">{lastYear}{'\uB144 \uD569\uACC4'}</Text>
            <Text size="xs" c="dimmed">{formatCurrency(lastYearFeeTotal)}</Text>
          </Group>
        </Card>

        {/* 작년 같은 기간 수임료 */}
        <Card padding="lg">
          <Group justify="space-between" mb="md">
            <Text fw={600}>{'\uC791\uB144 \uC218\uC784\uB8CC \uBE44\uAD50'}</Text>
            <Badge variant="light" color="gray" size="sm">{lastYear}</Badge>
          </Group>
          <BarChart data={lastYearFee} maxValue={allFeeMax} color="gray" labelKey="month" valueKey="amount" />
          <Divider my="sm" />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{lastYear}{'\uB144 \uD569\uACC4'}</Text>
            <Text size="sm" fw={600}>{formatCurrency(lastYearFeeTotal)}</Text>
          </Group>
        </Card>
      </SimpleGrid>

      {/* 실비 + 입금 연간 */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        <Card padding="lg">
          <Group justify="space-between" mb="md">
            <Text fw={600}>{'\uC2E4\uBE44 \uC6D4\uBCC4'}</Text>
            <Badge variant="light" color="orange" size="sm">{thisYear}</Badge>
          </Group>
          <BarChart data={thisYearExpense} color="orange" labelKey="month" valueKey="amount" />
          <Divider my="sm" />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">{thisYear}{'\uB144 \uD569\uACC4'}</Text>
            <Group gap="xs">
              <Text size="sm" fw={600} c="orange">{formatCurrency(thisYearExpenseTotal)}</Text>
              <ChangeBadge current={thisYearExpenseTotal} previous={lastYearExpenseTotal} />
            </Group>
          </Group>
        </Card>

        {/* 연간 총 요약 테이블 */}
        <Card padding="lg">
          <Text fw={600} mb="md">{'\uC5F0\uAC04 \uC694\uC57D \uBE44\uAD50'}</Text>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{'\uD56D\uBAA9'}</Table.Th>
                <Table.Th ta="right">{thisYear}</Table.Th>
                <Table.Th ta="right">{lastYear}</Table.Th>
                <Table.Th ta="right">{'\uBCC0\uD654'}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td><Text size="sm" fw={500}>{'\uC218\uC784\uB8CC'}</Text></Table.Td>
                <Table.Td ta="right"><Text size="sm" fw={600} c="indigo">{formatCurrencyShort(thisYearFeeTotal)}</Text></Table.Td>
                <Table.Td ta="right"><Text size="sm" c="dimmed">{formatCurrencyShort(lastYearFeeTotal)}</Text></Table.Td>
                <Table.Td ta="right"><ChangeBadge current={thisYearFeeTotal} previous={lastYearFeeTotal} /></Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td><Text size="sm" fw={500}>{'\uC785\uAE08'}</Text></Table.Td>
                <Table.Td ta="right"><Text size="sm" fw={600} c="teal">{formatCurrencyShort(thisYearDepositTotal)}</Text></Table.Td>
                <Table.Td ta="right"><Text size="sm" c="dimmed">{formatCurrencyShort(lastYearDepositTotal)}</Text></Table.Td>
                <Table.Td ta="right"><ChangeBadge current={thisYearDepositTotal} previous={lastYearDepositTotal} /></Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td><Text size="sm" fw={500}>{'\uC2E4\uBE44'}</Text></Table.Td>
                <Table.Td ta="right"><Text size="sm" fw={600} c="orange">{formatCurrencyShort(thisYearExpenseTotal)}</Text></Table.Td>
                <Table.Td ta="right"><Text size="sm" c="dimmed">{formatCurrencyShort(lastYearExpenseTotal)}</Text></Table.Td>
                <Table.Td ta="right"><ChangeBadge current={thisYearExpenseTotal} previous={lastYearExpenseTotal} /></Table.Td>
              </Table.Tr>
              <Table.Tr style={{ borderTop: '2px solid var(--mantine-color-gray-3)' }}>
                <Table.Td><Text size="sm" fw={700}>{'\uC21C\uC218\uC775'}</Text></Table.Td>
                <Table.Td ta="right">
                  <Text size="sm" fw={700} c={thisYearDepositTotal - thisYearExpenseTotal >= 0 ? 'blue' : 'red'}>
                    {formatCurrencyShort(thisYearDepositTotal - thisYearExpenseTotal)}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text size="sm" c="dimmed">{formatCurrencyShort(lastYearDepositTotal - lastYearExpenseTotal)}</Text>
                </Table.Td>
                <Table.Td ta="right">
                  <ChangeBadge
                    current={thisYearDepositTotal - thisYearExpenseTotal}
                    previous={lastYearDepositTotal - lastYearExpenseTotal}
                  />
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </Card>
      </SimpleGrid>
    </Stack>
  )
}

// --- 메인 컴포넌트 ---

export default function Billing() {
  const navigate = useNavigate()
  const { cases, consultations, casesFileId } = useCaseStore()
  const { showToast, isModalOpen, modalType, openModal, closeModal } = useUiStore()
  const [billings, setBillings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [activeTab, setActiveTab] = useState('list')

  useEffect(() => {
    if (!casesFileId) return
    setIsLoading(true)
    readCasesIndex(casesFileId).then((data) => {
      setBillings(data.billings || [])
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [casesFileId])

  const saveBillings = async (newBillings) => {
    if (!casesFileId) return
    const data = await readCasesIndex(casesFileId)
    data.billings = newBillings
    await writeCasesIndex(casesFileId, data)
    setBillings(newBillings)
  }

  const handleCreate = async (formData) => {
    const newBillings = [...billings, { ...formData, createdAt: new Date().toISOString() }]
    await saveBillings(newBillings)
    closeModal()
    showToast('\uBE44\uC6A9\uC774 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
  }

  const handleEdit = async (formData) => {
    const newBillings = billings.map((b) => b.id === formData.id ? { ...b, ...formData } : b)
    await saveBillings(newBillings)
    setExpandedId(null)
    showToast('\uBE44\uC6A9\uC774 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
  }

  const handleDelete = async (id) => {
    if (!confirm('\uC774 \uBE44\uC6A9 \uAE30\uB85D\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return
    const newBillings = billings.filter((b) => b.id !== id)
    await saveBillings(newBillings)
    setExpandedId(null)
    showToast('\uBE44\uC6A9\uC774 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
  }

  const getItemName = (caseId) => {
    const c = cases.find((x) => x.id === caseId)
    if (c) return { name: c.clientName, sub: c.caseNumber, category: 'case' }
    const co = consultations.find((x) => x.id === caseId)
    if (co) return { name: co.clientName, sub: co.subject, category: 'consultation' }
    return { name: caseId, sub: '', category: 'unknown' }
  }

  // 전체 통계 카드
  const stats = useMemo(() => {
    const totalFee = billings.filter((b) => b.type === 'fee').reduce((s, b) => s + (b.amount || 0), 0)
    const totalExpense = billings.filter((b) => b.type === 'expense').reduce((s, b) => s + (b.amount || 0), 0)
    const totalDeposit = billings.filter((b) => b.type === 'deposit').reduce((s, b) => s + (b.amount || 0), 0)
    const totalRefund = billings.filter((b) => b.type === 'refund').reduce((s, b) => s + (b.amount || 0), 0)
    return { totalFee, totalExpense, totalDeposit, totalRefund, balance: totalDeposit - totalRefund - totalExpense }
  }, [billings])

  const filtered = useMemo(() => {
    let result = billings
    if (filterType) result = result.filter((b) => b.type === filterType)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((b) => {
        const item = getItemName(b.caseId)
        return item.name.toLowerCase().includes(q) || item.sub?.toLowerCase().includes(q) || b.note?.toLowerCase().includes(q)
      })
    }
    return result.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
  }, [billings, filterType, searchQuery])

  return (
    <>
      <Container size="xl" py="lg">
        <Stack gap="lg">
          {/* 헤더 */}
          <Group justify="space-between">
            <Group gap="xs">
              <IconReceipt size={22} color="var(--mantine-color-teal-6)" />
              <Text size="lg" fw={700}>{'\uBE44\uC6A9 \uAD00\uB9AC'}</Text>
            </Group>
            <Button leftSection={<IconPlus size={16} />} onClick={() => openModal('createBilling')}>
              {'\uBE44\uC6A9 \uB4F1\uB85D'}
            </Button>
          </Group>

          {isLoading && (
            <Center py="xl">
              <Stack align="center" gap="sm">
                <Loader size="md" color="indigo" />
                <Text size="sm" c="dimmed">{'\uBE44\uC6A9 \uB370\uC774\uD130 \uBD88\uB7EC\uC624\uB294 \uC911...'}</Text>
              </Stack>
            </Center>
          )}

          {!isLoading && (
            <>
              {/* 전체 통계 카드 */}
              <SimpleGrid cols={{ base: 2, md: 5 }} spacing="md">
                <Card padding="md">
                  <Group gap="xs" mb={4}>
                    <ThemeIcon size={20} variant="light" color="indigo" radius="xl"><IconReceipt size={10} /></ThemeIcon>
                    <Text size="xs" c="dimmed">{'\uC218\uC784\uB8CC'}</Text>
                  </Group>
                  <Text size="lg" fw={700} c="indigo">{formatCurrency(stats.totalFee)}</Text>
                  {stats.totalFee >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(stats.totalFee)}</Text>}
                </Card>
                <Card padding="md">
                  <Group gap="xs" mb={4}>
                    <ThemeIcon size={20} variant="light" color="teal" radius="xl"><IconCash size={10} /></ThemeIcon>
                    <Text size="xs" c="dimmed">{'\uC785\uAE08'}</Text>
                  </Group>
                  <Text size="lg" fw={700} c="teal">{formatCurrency(stats.totalDeposit)}</Text>
                  {stats.totalDeposit >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(stats.totalDeposit)}</Text>}
                </Card>
                <Card padding="md">
                  <Group gap="xs" mb={4}>
                    <ThemeIcon size={20} variant="light" color="orange" radius="xl"><IconCreditCard size={10} /></ThemeIcon>
                    <Text size="xs" c="dimmed">{'\uC2E4\uBE44'}</Text>
                  </Group>
                  <Text size="lg" fw={700} c="orange">{formatCurrency(stats.totalExpense)}</Text>
                  {stats.totalExpense >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(stats.totalExpense)}</Text>}
                </Card>
                <Card padding="md">
                  <Group gap="xs" mb={4}>
                    <ThemeIcon size={20} variant="light" color="red" radius="xl"><IconTrendingDown size={10} /></ThemeIcon>
                    <Text size="xs" c="dimmed">{'\uD658\uBD88'}</Text>
                  </Group>
                  <Text size="lg" fw={700} c="red">{formatCurrency(stats.totalRefund)}</Text>
                </Card>
                <Card padding="md">
                  <Group gap="xs" mb={4}>
                    <ThemeIcon size={20} variant="light" color="blue" radius="xl"><IconChartBar size={10} /></ThemeIcon>
                    <Text size="xs" c="dimmed">{'\uC794\uC561'}</Text>
                  </Group>
                  <Text size="lg" fw={700} c={stats.balance >= 0 ? 'blue' : 'red'}>{formatCurrency(stats.balance)}</Text>
                  {Math.abs(stats.balance) >= 10000 && <Text size="xs" c="dimmed">{numberToKorean(Math.abs(stats.balance))}</Text>}
                </Card>
              </SimpleGrid>

              {/* 탭: 목록 / 통계 */}
              <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                  <Tabs.Tab value="list" leftSection={<IconReceipt size={16} />}>{'\uBE44\uC6A9 \uBAA9\uB85D'}</Tabs.Tab>
                  <Tabs.Tab value="stats" leftSection={<IconChartBar size={16} />}>{'\uD1B5\uACC4 \uBD84\uC11D'}</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="list" pt="md">
                  <Stack gap="md">
                    {/* 검색 + 필터 */}
                    <TextInput
                      placeholder={'\uC758\uB8B0\uC778\uBA85, \uC0AC\uAC74\uBC88\uD638, \uBA54\uBAA8...'}
                      leftSection={<IconSearch size={16} />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    />

                    <Group gap="xs">
                      <Button variant={filterType === null ? 'filled' : 'default'} size="xs" onClick={() => setFilterType(null)}>
                        {'\uC804\uCCB4'} ({billings.length})
                      </Button>
                      {PAYMENT_TYPES.map((t) => {
                        const count = billings.filter((b) => b.type === t.value).length
                        return (
                          <Button key={t.value} variant={filterType === t.value ? 'filled' : 'default'} size="xs" onClick={() => setFilterType(filterType === t.value ? null : t.value)}>
                            {t.label} ({count})
                          </Button>
                        )
                      })}
                    </Group>

                    {filtered.length === 0 ? (
                      <Center py="xl">
                        <Stack align="center" gap="sm">
                          <ThemeIcon size={48} radius="xl" variant="light" color="gray"><IconReceipt size={24} /></ThemeIcon>
                          <Text c="dimmed" size="sm">
                            {billings.length === 0 ? '\uB4F1\uB85D\uB41C \uBE44\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4' : '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}
                          </Text>
                          {billings.length === 0 && (
                            <Button variant="subtle" onClick={() => openModal('createBilling')}>{'\uCCAB \uBC88\uC9F8 \uBE44\uC6A9 \uB4F1\uB85D\uD558\uAE30'}</Button>
                          )}
                        </Stack>
                      </Center>
                    ) : (
                      <Card padding={0}>
                        <Table.ScrollContainer minWidth={800}>
                          <Table striped={false} highlightOnHover>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th>{'\uB0A0\uC9DC'}</Table.Th>
                                <Table.Th>{'\uC720\uD615'}</Table.Th>
                                <Table.Th>{'\uC0AC\uAC74 / \uC790\uBB38'}</Table.Th>
                                <Table.Th>{'\uAE08\uC561'}</Table.Th>
                                <Table.Th>{'\uACB0\uC81C'}</Table.Th>
                                <Table.Th>{'\uBA54\uBAA8'}</Table.Th>
                                <Table.Th style={{ width: 40 }}></Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {filtered.map((bill) => (
                                <BillingRow
                                  key={bill.id}
                                  bill={bill}
                                  getItemName={getItemName}
                                  navigate={navigate}
                                  onEdit={handleEdit}
                                  onDelete={handleDelete}
                                  isExpanded={expandedId === bill.id}
                                  onToggle={() => setExpandedId(expandedId === bill.id ? null : bill.id)}
                                  cases={cases}
                                  consultations={consultations}
                                />
                              ))}
                            </Table.Tbody>
                          </Table>
                        </Table.ScrollContainer>
                      </Card>
                    )}
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="stats" pt="md">
                  <StatsPanel billings={billings} />
                </Tabs.Panel>
              </Tabs>
            </>
          )}
        </Stack>
      </Container>

      <Modal isOpen={isModalOpen && modalType === 'createBilling'} onClose={closeModal} title={'\uBE44\uC6A9 \uB4F1\uB85D'}>
        <BillingForm cases={cases} consultations={consultations} onSubmit={handleCreate} onCancel={closeModal} />
      </Modal>
    </>
  )
}
