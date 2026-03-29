import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Group, Text, Button, Card,
  SimpleGrid, Stack, Box, Container, UnstyledButton,
  TextInput, Select, Badge, ActionIcon, Alert, Textarea,
  Table, ThemeIcon, Center, Loader, Collapse,
} from '@mantine/core'
import {
  IconArrowLeft, IconPlus, IconReceipt,
  IconCash, IconCreditCard, IconTrash, IconEdit,
  IconSearch, IconChartBar, IconCheck, IconX,
  IconChevronDown, IconChevronUp,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import { readCasesIndex, writeCasesIndex } from '../api/drive'
import Modal from '../components/ui/Modal'

// --- \uAE08\uC561 \uD3EC\uB9F7 \uC720\uD2F8\uB9AC\uD2F0 ---

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

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// \uC785\uB825\uC6A9: \uC22B\uC790\uB9CC \uCD94\uCD9C
function stripNonDigits(str) {
  return str.replace(/[^0-9]/g, '')
}

// \uC785\uB825\uC6A9: \uC27C\uD45C \uD3EC\uB9F7
function formatWithCommas(numStr) {
  if (!numStr) return ''
  return Number(numStr).toLocaleString('ko-KR')
}

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

// --- \uAE08\uC561 \uC785\uB825 \uCEF4\uD3EC\uB10C\uD2B8 (\uC27C\uD45C + \uD55C\uAE00 \uD45C\uC2DC) ---

function AmountInput({ value, onChange, label, required, withAsterisk }) {
  const rawStr = String(value || '')
  const display = rawStr ? formatWithCommas(rawStr) : ''
  const koreanText = rawStr && Number(rawStr) > 0 ? numberToKorean(rawStr) : ''

  const handleChange = (e) => {
    const digits = stripNonDigits(e.currentTarget.value)
    onChange(digits)
  }

  return (
    <Box>
      <TextInput
        label={label}
        placeholder="0"
        required={required}
        withAsterisk={withAsterisk}
        value={display}
        onChange={handleChange}
        styles={{
          input: { fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' },
        }}
      />
      {koreanText && (
        <Text size="xs" c="indigo" mt={2} fw={500}>
          {koreanText}
        </Text>
      )}
    </Box>
  )
}

// --- \uBE44\uC6A9 \uD3FC ---

function BillingForm({ cases, consultations, initialData, onSubmit, onCancel, compact }) {
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
      await onSubmit({
        ...form,
        amount: Number(form.amount),
        id: isEditing ? initialData.id : `bill-${Date.now()}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap="sm">
        <Select
          label={'\uC0AC\uAC74 / \uC790\uBB38'}
          placeholder={'\uC120\uD0DD\uD558\uC138\uC694'}
          data={allItems}
          value={form.caseId}
          onChange={(val) => handleChange('caseId', val)}
          searchable
          required
          withAsterisk
        />
        <SimpleGrid cols={2}>
          <Select
            label={'\uC720\uD615'}
            data={PAYMENT_TYPES}
            value={form.type}
            onChange={(val) => handleChange('type', val)}
          />
          <AmountInput
            label={'\uAE08\uC561'}
            required
            withAsterisk
            value={form.amount}
            onChange={(val) => handleChange('amount', val)}
          />
        </SimpleGrid>
        <SimpleGrid cols={2}>
          <Select
            label={'\uACB0\uC81C \uBC29\uBC95'}
            data={PAYMENT_METHODS}
            value={form.method}
            onChange={(val) => handleChange('method', val)}
          />
          <TextInput
            label={'\uB0A0\uC9DC'}
            type="date"
            value={form.date}
            onChange={(e) => handleChange('date', e.currentTarget.value)}
          />
        </SimpleGrid>
        <TextInput
          label={'\uBA54\uBAA8'}
          placeholder={'\uCC29\uC218\uAE08, \uC131\uACF5\uBCF4\uC218, \uC778\uC9C0\uB300 \uB4F1'}
          value={form.note}
          onChange={(e) => handleChange('note', e.currentTarget.value)}
        />
        <Group justify="flex-end" gap="sm" mt="sm">
          <Button variant="default" onClick={onCancel} leftSection={<IconX size={14} />}>{'\uCDE8\uC18C'}</Button>
          <Button type="submit" loading={isSubmitting} disabled={!form.caseId || !form.amount} leftSection={<IconCheck size={14} />}>
            {isEditing ? '\uC218\uC815' : '\uB4F1\uB85D'}
          </Button>
        </Group>
      </Stack>
    </form>
  )
}

// --- \uBE44\uC6A9 \uD589 \uCEF4\uD3EC\uB10C\uD2B8 (\uD074\uB9AD\uC2DC \uD655\uC7A5) ---

function BillingRow({ bill, getItemName, navigate, onEdit, onDelete, isExpanded, onToggle, cases, consultations }) {
  const item = getItemName(bill.caseId)
  const tc = TYPE_CONFIG[bill.type] || { label: bill.type, color: 'gray' }
  const methodLabel = PAYMENT_METHODS.find((m) => m.value === bill.method)?.label || bill.method

  return (
    <>
      <Table.Tr
        style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'var(--mantine-color-indigo-0)' : undefined }}
        onClick={onToggle}
      >
        <Table.Td>
          <Text size="sm" ff="monospace">{formatDate(bill.date)}</Text>
        </Table.Td>
        <Table.Td>
          <Badge color={tc.color} variant="light" size="sm">{tc.label}</Badge>
        </Table.Td>
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
            <Text
              size="sm"
              fw={600}
              c={bill.type === 'deposit' ? 'teal' : bill.type === 'refund' ? 'red' : undefined}
            >
              {bill.type === 'deposit' ? '+' : bill.type === 'refund' ? '-' : ''}
              {formatCurrency(bill.amount)}
            </Text>
            {bill.amount >= 10000 && (
              <Text size="xs" c="dimmed">{numberToKorean(bill.amount)}</Text>
            )}
          </Stack>
        </Table.Td>
        <Table.Td>
          <Text size="xs" c="dimmed">{methodLabel}</Text>
        </Table.Td>
        <Table.Td>
          <Text size="xs" c="dimmed" truncate style={{ maxWidth: 200 }}>{bill.note || '-'}</Text>
        </Table.Td>
        <Table.Td>
          {isExpanded ? <IconChevronUp size={14} color="gray" /> : <IconChevronDown size={14} color="gray" />}
        </Table.Td>
      </Table.Tr>
      {isExpanded && (
        <Table.Tr>
          <Table.Td colSpan={7} style={{ backgroundColor: 'var(--mantine-color-gray-0)', padding: 0 }}>
            <Box p="md">
              <BillingForm
                cases={cases}
                consultations={consultations}
                initialData={bill}
                onSubmit={onEdit}
                onCancel={onToggle}
              />
              <Group justify="flex-start" mt="sm">
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  leftSection={<IconTrash size={14} />}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(bill.id)
                  }}
                >
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

// --- \uBA54\uC778 \uCEF4\uD3EC\uB10C\uD2B8 ---

export default function Billing() {
  const navigate = useNavigate()
  const { cases, consultations, casesFileId } = useCaseStore()
  const { showToast, isModalOpen, modalType, openModal, closeModal } = useUiStore()
  const [billings, setBillings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Load billings from cases.json
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

  // Find case/consultation name by ID
  const getItemName = (caseId) => {
    const c = cases.find((x) => x.id === caseId)
    if (c) return { name: c.clientName, sub: c.caseNumber, category: 'case' }
    const co = consultations.find((x) => x.id === caseId)
    if (co) return { name: co.clientName, sub: co.subject, category: 'consultation' }
    return { name: caseId, sub: '', category: 'unknown' }
  }

  // Stats
  const stats = useMemo(() => {
    const totalFee = billings.filter((b) => b.type === 'fee').reduce((s, b) => s + (b.amount || 0), 0)
    const totalExpense = billings.filter((b) => b.type === 'expense').reduce((s, b) => s + (b.amount || 0), 0)
    const totalDeposit = billings.filter((b) => b.type === 'deposit').reduce((s, b) => s + (b.amount || 0), 0)
    const totalRefund = billings.filter((b) => b.type === 'refund').reduce((s, b) => s + (b.amount || 0), 0)
    return {
      totalFee,
      totalExpense,
      totalDeposit,
      totalRefund,
      balance: totalDeposit - totalRefund - totalExpense,
    }
  }, [billings])

  // Filter
  const filtered = useMemo(() => {
    let result = billings
    if (filterType) result = result.filter((b) => b.type === filterType)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((b) => {
        const item = getItemName(b.caseId)
        return item.name.toLowerCase().includes(q) ||
          item.sub?.toLowerCase().includes(q) ||
          b.note?.toLowerCase().includes(q)
      })
    }
    return result.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
  }, [billings, filterType, searchQuery])

  return (
    <>
      <Container size="xl" py="lg">
          <Stack gap="lg">
            {/* Back + Title */}
            <Group gap="sm">
              <ActionIcon variant="subtle" color="gray" onClick={() => navigate('/')}>
                <IconArrowLeft size={18} />
              </ActionIcon>
              <Text size="lg" fw={700}>{'\uBE44\uC6A9 \uAD00\uB9AC'}</Text>
            </Group>

            {isLoading && (
              <Center py="xl">
                <Stack align="center" gap="sm">
                  <Loader size="md" color="indigo" />
                  <Text size="sm" c="dimmed">{'\uBE44\uC6A9 \uB370\uC774\uD130 \uBD88\uB7EC\uC624\uB294 \uC911...'}</Text>
                </Stack>
              </Center>
            )}

            {/* Stats */}
            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
              <Card padding="md">
                <Group gap="xs" mb={4}>
                  <ThemeIcon size={20} variant="light" color="indigo" radius="xl">
                    <IconReceipt size={10} />
                  </ThemeIcon>
                  <Text size="xs" c="dimmed">{'\uC218\uC784\uB8CC \uCD1D\uC561'}</Text>
                </Group>
                <Text size="lg" fw={700} c="indigo">{formatCurrency(stats.totalFee)}</Text>
                {stats.totalFee >= 10000 && (
                  <Text size="xs" c="dimmed">{numberToKorean(stats.totalFee)}</Text>
                )}
              </Card>
              <Card padding="md">
                <Group gap="xs" mb={4}>
                  <ThemeIcon size={20} variant="light" color="teal" radius="xl">
                    <IconCash size={10} />
                  </ThemeIcon>
                  <Text size="xs" c="dimmed">{'\uC785\uAE08 \uCD1D\uC561'}</Text>
                </Group>
                <Text size="lg" fw={700} c="teal">{formatCurrency(stats.totalDeposit)}</Text>
                {stats.totalDeposit >= 10000 && (
                  <Text size="xs" c="dimmed">{numberToKorean(stats.totalDeposit)}</Text>
                )}
              </Card>
              <Card padding="md">
                <Group gap="xs" mb={4}>
                  <ThemeIcon size={20} variant="light" color="orange" radius="xl">
                    <IconCreditCard size={10} />
                  </ThemeIcon>
                  <Text size="xs" c="dimmed">{'\uC2E4\uBE44 \uCD1D\uC561'}</Text>
                </Group>
                <Text size="lg" fw={700} c="orange">{formatCurrency(stats.totalExpense)}</Text>
                {stats.totalExpense >= 10000 && (
                  <Text size="xs" c="dimmed">{numberToKorean(stats.totalExpense)}</Text>
                )}
              </Card>
              <Card padding="md">
                <Group gap="xs" mb={4}>
                  <ThemeIcon size={20} variant="light" color="blue" radius="xl">
                    <IconChartBar size={10} />
                  </ThemeIcon>
                  <Text size="xs" c="dimmed">{'\uC794\uC561'}</Text>
                </Group>
                <Text size="lg" fw={700} c={stats.balance >= 0 ? 'blue' : 'red'}>
                  {formatCurrency(stats.balance)}
                </Text>
                {Math.abs(stats.balance) >= 10000 && (
                  <Text size="xs" c="dimmed">{numberToKorean(Math.abs(stats.balance))}</Text>
                )}
              </Card>
            </SimpleGrid>

            {/* Controls */}
            <Group gap="sm" wrap="wrap">
              <TextInput
                placeholder={'\uC758\uB8B0\uC778\uBA85, \uC0AC\uAC74\uBC88\uD638, \uBA54\uBAA8...'}
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                style={{ flex: 1, minWidth: 200 }}
              />
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => openModal('createBilling')}
              >
                {'\uBE44\uC6A9 \uB4F1\uB85D'}
              </Button>
            </Group>

            {/* Type filter */}
            <Group gap="xs">
              <Button
                variant={filterType === null ? 'filled' : 'default'}
                size="xs"
                onClick={() => setFilterType(null)}
              >
                {'\uC804\uCCB4'} ({billings.length})
              </Button>
              {PAYMENT_TYPES.map((t) => {
                const count = billings.filter((b) => b.type === t.value).length
                return (
                  <Button
                    key={t.value}
                    variant={filterType === t.value ? 'filled' : 'default'}
                    size="xs"
                    onClick={() => setFilterType(filterType === t.value ? null : t.value)}
                  >
                    {t.label} ({count})
                  </Button>
                )
              })}
            </Group>

            {/* Billing list */}
            {filtered.length === 0 ? (
              <Center py="xl">
                <Stack align="center" gap="sm">
                  <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                    <IconReceipt size={24} />
                  </ThemeIcon>
                  <Text c="dimmed" size="sm">
                    {billings.length === 0
                      ? '\uB4F1\uB85D\uB41C \uBE44\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'
                      : '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}
                  </Text>
                  {billings.length === 0 && (
                    <Button
                      variant="subtle"
                      onClick={() => openModal('createBilling')}
                    >
                      {'\uCCAB \uBC88\uC9F8 \uBE44\uC6A9 \uB4F1\uB85D\uD558\uAE30'}
                    </Button>
                  )}
                </Stack>
              </Center>
            ) : (
              <Card padding={0}>
                <Box style={{ overflowX: 'auto' }}>
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
                </Box>
              </Card>
            )}
          </Stack>
        </Container>

      {/* \uC0C8 \uBE44\uC6A9 \uB4F1\uB85D \uBAA8\uB2EC (\uC0DD\uC131\uB9CC) */}
      <Modal isOpen={isModalOpen && modalType === 'createBilling'} onClose={closeModal} title={'\uBE44\uC6A9 \uB4F1\uB85D'}>
        <BillingForm
          cases={cases}
          consultations={consultations}
          onSubmit={handleCreate}
          onCancel={closeModal}
        />
      </Modal>
    </>
  )
}
