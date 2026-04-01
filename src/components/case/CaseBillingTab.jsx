import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Group, Text, Stack, SimpleGrid, Badge, Button, Progress, Box,
  Table, Center, Loader,
} from '@mantine/core'
import {
  IconReceipt, IconArrowRight, IconContract, IconCoin, IconFileInvoice,
  IconPaperclip, IconPlus,
} from '@tabler/icons-react'
import { useCaseStore } from '../../store/caseStore'
import { readCasesIndex } from '../../api/drive'

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '0원'
  return amount.toLocaleString('ko-KR') + '원'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function getPaymentStatus(total, paid) {
  if (!total || total === 0) return null
  if (paid >= total) return { label: '완납', color: 'green' }
  if (paid > 0) return { label: '일부입금', color: 'orange' }
  return { label: '미입금', color: 'red' }
}

const RETAINER_TYPE_LABELS = {
  mixed: '착수금 + 성공보수',
  fixed: '착수금 고정',
  hourly: '시간제',
  contingency: '성공보수 전용',
}

const INVOICE_STATUS = {
  draft: { label: '초안', color: 'gray' },
  sent: { label: '발송', color: 'blue' },
  paid: { label: '완납', color: 'green' },
  overdue: { label: '연체', color: 'red' },
  cancelled: { label: '취소', color: 'gray' },
}

export default function CaseBillingTab({ caseData }) {
  const navigate = useNavigate()
  const { casesFileId } = useCaseStore()
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!casesFileId) { setIsLoading(false); return }
    readCasesIndex(casesFileId).then((idx) => {
      setData({
        retainers: (idx.retainers || []).filter((r) => r.caseId === caseData.id),
        disbursements: (idx.disbursements || []).filter((d) => d.caseId === caseData.id),
        invoices: (idx.invoices || []).filter((i) => i.caseId === caseData.id),
      })
    }).catch(() => {}).finally(() => setIsLoading(false))
  }, [casesFileId, caseData.id])

  if (isLoading) {
    return <Center py="xl"><Loader size="sm" color="teal" /></Center>
  }

  if (!data) {
    return (
      <Center py="xl">
        <Stack align="center" gap="xs">
          <Text size="sm" c="dimmed">비용 데이터를 불러올 수 없습니다.</Text>
          <Button variant="light" size="xs" onClick={() => navigate('/billing')}>비용 관리로 이동</Button>
        </Stack>
      </Center>
    )
  }

  const { retainers, disbursements, invoices } = data
  const hasAny = retainers.length > 0 || disbursements.length > 0 || invoices.length > 0

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <IconReceipt size={18} color="var(--mantine-color-teal-6)" />
          <Text size="md" fw={600}>비용 현황</Text>
        </Group>
        <Button
          variant="light" color="teal" size="xs"
          rightSection={<IconArrowRight size={12} />}
          onClick={() => navigate('/billing')}
        >
          비용 관리
        </Button>
      </Group>

      {!hasAny ? (
        <Card padding="lg">
          <Stack align="center" gap="sm" py="lg">
            <IconReceipt size={32} color="var(--mantine-color-gray-4)" />
            <Text size="sm" c="dimmed">등록된 수임료/실비가 없습니다.</Text>
            <Button
              variant="light" size="xs" color="teal"
              leftSection={<IconPlus size={14} />}
              onClick={() => navigate('/billing')}
            >
              비용 관리에서 등록
            </Button>
          </Stack>
        </Card>
      ) : (
        <>
          {/* 수임 계약 */}
          {retainers.map((ret) => {
            const showRetainer = ret.type === 'fixed' || ret.type === 'mixed'
            const showContingency = ret.type === 'contingency' || ret.type === 'mixed'
            const showHourly = ret.type === 'hourly'
            const retainerStatus = showRetainer ? getPaymentStatus(ret.retainerFee, ret.retainerPaid) : null
            const retainerPct = ret.retainerFee > 0 ? Math.min((ret.retainerPaid / ret.retainerFee) * 100, 100) : 0

            return (
              <Card key={ret.id} padding="lg" withBorder>
                <Group justify="space-between" mb="sm">
                  <Group gap="sm">
                    <IconContract size={16} />
                    <Text size="sm" fw={600}>수임 계약</Text>
                    <Badge variant="light" color="indigo" size="xs">
                      {RETAINER_TYPE_LABELS[ret.type] || ret.type}
                    </Badge>
                  </Group>
                  {ret.contractFileLink && (
                    <Button
                      variant="subtle" size="xs" color="teal"
                      leftSection={<IconPaperclip size={14} />}
                      component="a"
                      href={ret.contractFileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      계약서
                    </Button>
                  )}
                </Group>

                <Text size="xs" c="dimmed" mb="md">
                  계약일: {formatDate(ret.contractDate)} · 부가세: {ret.vatIncluded ? '포함' : '별도'}
                </Text>

                <Stack gap="sm">
                  {showRetainer && (
                    <div>
                      <Group justify="space-between" mb={4}>
                        <Text size="sm" fw={500}>착수금</Text>
                        <Group gap="xs">
                          <Text size="sm" fw={600}>{formatCurrency(ret.retainerFee)}</Text>
                          {retainerStatus && <Badge size="xs" color={retainerStatus.color}>{retainerStatus.label}</Badge>}
                        </Group>
                      </Group>
                      <Progress
                        value={retainerPct}
                        color={retainerPct >= 100 ? 'green' : retainerPct > 0 ? 'orange' : 'red'}
                        size="xs" mb={4}
                      />
                      <Text size="xs" c="dimmed">
                        입금: {formatCurrency(ret.retainerPaid)}
                        {ret.retainerPaidAt && ` (${formatDate(ret.retainerPaidAt)})`}
                      </Text>
                    </div>
                  )}

                  {showContingency && (
                    <div>
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>성공보수</Text>
                        <Text size="sm" fw={600}>{formatCurrency(ret.contingencyFee)}</Text>
                      </Group>
                      {ret.contingencyNote && <Text size="xs" c="dimmed">{ret.contingencyNote}</Text>}
                    </div>
                  )}

                  {showHourly && (
                    <div>
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>시간제</Text>
                        <Text size="sm" fw={600}>시간당 {formatCurrency(ret.hourlyRate)}</Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        누적: {ret.hoursLogged || 0}시간 · 합계: {formatCurrency((ret.hoursLogged || 0) * (ret.hourlyRate || 0))}
                      </Text>
                    </div>
                  )}
                </Stack>
              </Card>
            )
          })}

          {/* 실비 내역 */}
          {disbursements.length > 0 && (
            <Card padding="lg" withBorder>
              <Group justify="space-between" mb="sm">
                <Group gap="sm">
                  <IconCoin size={16} />
                  <Text size="sm" fw={600}>실비 내역</Text>
                  <Badge variant="light" color="orange" size="xs">{disbursements.length}건</Badge>
                </Group>
                {(() => {
                  const unbilled = disbursements.filter((d) => d.billable && !d.billed)
                  return unbilled.length > 0 ? (
                    <Text size="xs" c="orange" fw={500}>미청구 {unbilled.length}건 · {formatCurrency(unbilled.reduce((s, d) => s + (d.amount || 0), 0))}</Text>
                  ) : null
                })()}
              </Group>

              <Table.ScrollContainer minWidth={500}>
                <Table striped={false} highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>날짜</Table.Th>
                      <Table.Th>카테고리</Table.Th>
                      <Table.Th ta="right">금액</Table.Th>
                      <Table.Th>내용</Table.Th>
                      <Table.Th>청구</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {disbursements.map((d) => (
                      <Table.Tr key={d.id}>
                        <Table.Td><Text size="xs" ff="monospace">{formatDate(d.date)}</Text></Table.Td>
                        <Table.Td><Badge variant="light" color="orange" size="xs">{d.category}</Badge></Table.Td>
                        <Table.Td ta="right"><Text size="sm" fw={500}>{formatCurrency(d.amount)}</Text></Table.Td>
                        <Table.Td><Text size="xs" c="dimmed" truncate style={{ maxWidth: 200 }}>{d.description || '-'}</Text></Table.Td>
                        <Table.Td>
                          {d.billed ? (
                            <Badge size="xs" color="green" variant="light">청구완료</Badge>
                          ) : d.billable ? (
                            <Badge size="xs" color="orange" variant="light">미청구</Badge>
                          ) : (
                            <Text size="xs" c="dimmed">비청구</Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>

              <Group justify="flex-end" mt="sm">
                <Text size="sm" fw={600}>합계: {formatCurrency(disbursements.reduce((s, d) => s + (d.amount || 0), 0))}</Text>
              </Group>
            </Card>
          )}

          {/* 청구서 이력 */}
          {invoices.length > 0 && (
            <Card padding="lg" withBorder>
              <Group gap="sm" mb="sm">
                <IconFileInvoice size={16} />
                <Text size="sm" fw={600}>청구서 이력</Text>
                <Badge variant="light" color="blue" size="xs">{invoices.length}건</Badge>
              </Group>

              <Table.ScrollContainer minWidth={500}>
                <Table striped={false} highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>청구번호</Table.Th>
                      <Table.Th>발행일</Table.Th>
                      <Table.Th ta="right">금액</Table.Th>
                      <Table.Th>상태</Table.Th>
                      <Table.Th>납부기한</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {invoices.map((inv) => {
                      const st = INVOICE_STATUS[inv.status] || INVOICE_STATUS.draft
                      return (
                        <Table.Tr key={inv.id}>
                          <Table.Td><Text size="xs" ff="monospace" c="indigo" fw={500}>{inv.invoiceNumber}</Text></Table.Td>
                          <Table.Td><Text size="xs">{formatDate(inv.issueDate)}</Text></Table.Td>
                          <Table.Td ta="right"><Text size="sm" fw={600}>{formatCurrency(inv.total)}</Text></Table.Td>
                          <Table.Td><Badge size="xs" color={st.color} variant="light">{st.label}</Badge></Table.Td>
                          <Table.Td><Text size="xs" c="dimmed">{formatDate(inv.dueDate)}</Text></Table.Td>
                        </Table.Tr>
                      )
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            </Card>
          )}
        </>
      )}
    </Stack>
  )
}
