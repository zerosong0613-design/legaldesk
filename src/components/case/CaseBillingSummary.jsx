import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Group, Text, Stack, SimpleGrid, Badge, Button, Progress } from '@mantine/core'
import { IconReceipt, IconArrowRight } from '@tabler/icons-react'
import { useCaseStore } from '../../store/caseStore'
import { readCasesIndex } from '../../api/drive'

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '0원'
  return amount.toLocaleString('ko-KR') + '원'
}

function getPaymentStatus(total, paid) {
  if (!total || total === 0) return null
  if (paid >= total) return { label: '완납', color: 'green' }
  if (paid > 0) return { label: '일부입금', color: 'orange' }
  return { label: '미입금', color: 'red' }
}

export default function CaseBillingSummary({ caseId }) {
  const navigate = useNavigate()
  const { casesFileId } = useCaseStore()
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!casesFileId) return
    readCasesIndex(casesFileId).then((idx) => {
      const retainers = (idx.retainers || []).filter((r) => r.caseId === caseId)
      const disbursements = (idx.disbursements || []).filter((d) => d.caseId === caseId)
      const invoices = (idx.invoices || []).filter((i) => i.caseId === caseId)
      setData({ retainers, disbursements, invoices })
    }).catch(() => {})
  }, [casesFileId, caseId])

  if (!data) return null

  const { retainers, disbursements, invoices } = data
  const hasAny = retainers.length > 0 || disbursements.length > 0 || invoices.length > 0

  if (!hasAny) {
    return (
      <Card padding="lg">
        <Group justify="space-between" mb="sm">
          <Group gap="xs">
            <IconReceipt size={16} />
            <Text size="sm" fw={600}>비용 현황</Text>
          </Group>
          <Button
            size="xs" variant="subtle" color="teal"
            rightSection={<IconArrowRight size={12} />}
            onClick={() => navigate('/billing')}
          >
            비용 관리
          </Button>
        </Group>
        <Text size="xs" c="dimmed" ta="center" py="sm">
          등록된 수임료/실비가 없습니다. 비용 관리에서 등록하세요.
        </Text>
      </Card>
    )
  }

  // 수임 계약 요약
  const retainer = retainers[0]
  const retainerFee = retainer?.retainerFee || 0
  const retainerPaid = retainer?.retainerPaid || 0
  const contingencyFee = retainer?.contingencyFee || 0
  const contingencyPaid = retainer?.contingencyPaid || 0
  const retainerStatus = getPaymentStatus(retainerFee, retainerPaid)
  const contingencyStatus = getPaymentStatus(contingencyFee, contingencyPaid)

  // 실비 요약
  const totalDisbursement = disbursements.reduce((s, d) => s + (d.amount || 0), 0)
  const unbilledCount = disbursements.filter((d) => d.billable && !d.billed).length

  // 미수금
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
  const unpaidTotal = unpaidInvoices.reduce((s, i) => s + (i.total || 0), 0)

  return (
    <Card padding="lg">
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <IconReceipt size={16} />
          <Text size="sm" fw={600}>비용 현황</Text>
        </Group>
        <Button
          size="xs" variant="subtle" color="teal"
          rightSection={<IconArrowRight size={12} />}
          onClick={() => navigate('/billing')}
        >
          비용 관리
        </Button>
      </Group>

      <Stack gap="sm">
        {/* 수임료 */}
        {retainer && (
          <>
            {retainerFee > 0 && (
              <div>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed">착수금</Text>
                  {retainerStatus && (
                    <Badge size="xs" variant="light" color={retainerStatus.color}>{retainerStatus.label}</Badge>
                  )}
                </Group>
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={500}>{formatCurrency(retainerFee)}</Text>
                  <Text size="xs" c="dimmed">입금 {formatCurrency(retainerPaid)}</Text>
                </Group>
                <Progress
                  value={retainerFee > 0 ? Math.min(100, (retainerPaid / retainerFee) * 100) : 0}
                  size="xs"
                  color={retainerStatus?.color || 'gray'}
                />
              </div>
            )}
            {contingencyFee > 0 && (
              <div>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" c="dimmed">성공보수</Text>
                  {contingencyStatus && (
                    <Badge size="xs" variant="light" color={contingencyStatus.color}>{contingencyStatus.label}</Badge>
                  )}
                </Group>
                <Text size="sm" fw={500}>{formatCurrency(contingencyFee)}</Text>
              </div>
            )}
          </>
        )}

        {/* 실비 */}
        {disbursements.length > 0 && (
          <SimpleGrid cols={2}>
            <div>
              <Text size="xs" c="dimmed">실비 지출</Text>
              <Text size="sm" fw={500}>{formatCurrency(totalDisbursement)}</Text>
              <Text size="xs" c="dimmed">{disbursements.length}건</Text>
            </div>
            {unbilledCount > 0 && (
              <div>
                <Text size="xs" c="dimmed">미청구 실비</Text>
                <Text size="sm" fw={500} c="orange">{unbilledCount}건</Text>
              </div>
            )}
          </SimpleGrid>
        )}

        {/* 미수금 */}
        {unpaidTotal > 0 && (
          <div>
            <Text size="xs" c="dimmed">미수금</Text>
            <Group gap="xs">
              <Text size="sm" fw={600} c="red">{formatCurrency(unpaidTotal)}</Text>
              <Text size="xs" c="dimmed">{unpaidInvoices.length}건</Text>
            </Group>
          </div>
        )}
      </Stack>
    </Card>
  )
}
