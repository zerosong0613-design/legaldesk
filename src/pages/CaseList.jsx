import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Group, Text, Button, Badge, Card, SimpleGrid, TextInput,
  Stack, Alert, Container,
} from '@mantine/core'
import { IconSearch, IconPlus, IconScale } from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import CaseCard from '../components/case/CaseCard'
import CaseForm from '../components/case/CaseForm'
import Modal from '../components/ui/Modal'

const STATUS_FILTERS = [
  { label: '\uC804\uCCB4', value: null },
  { label: '\uC811\uC218', value: '\uC811\uC218' },
  { label: '\uC9C4\uD589', value: '\uC9C4\uD589' },
  { label: '\uC885\uACB0', value: '\uC885\uACB0' },
  { label: '\uBCF4\uB958', value: '\uBCF4\uB958' },
]

function matchesQuery(item, q) {
  return (
    item.clientName?.toLowerCase().includes(q) ||
    item.caseNumber?.toLowerCase().includes(q) ||
    item.type?.toLowerCase().includes(q) ||
    item.court?.toLowerCase().includes(q) ||
    item.tags?.some((t) => t.toLowerCase().includes(q))
  )
}

export default function CaseList() {
  const navigate = useNavigate()
  const {
    cases, createCase, updateCase, deleteCase,
    error: storeError,
  } = useCaseStore()
  const { isModalOpen, modalType, modalData, openModal, closeModal, showToast } = useUiStore()

  const [statusFilter, setStatusFilter] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    let result = cases
    if (statusFilter) result = result.filter((c) => c.status === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) => matchesQuery(c, q))
    }
    return result.sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0))
  }, [cases, statusFilter, searchQuery])

  const handleCreate = async (data) => {
    const result = await createCase(data)
    if (result) { closeModal(); showToast('\uC0AC\uAC74\uC774 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success') }
  }
  const handleEdit = async (data) => {
    await updateCase(modalData.id, data)
    closeModal(); showToast('\uC0AC\uAC74\uC774 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
  }
  const handleDelete = async () => {
    await deleteCase(modalData.id)
    closeModal(); showToast('\uC0AC\uAC74\uC774 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
  }

  return (
    <>
      <Container size="xl" py="lg">
        <Stack gap="lg">
          {/* \uD5E4\uB354 */}
          <Group justify="space-between">
            <Group gap="xs">
              <IconScale size={22} color="var(--mantine-color-blue-6)" />
              <Text size="lg" fw={700}>{'\uC0AC\uAC74 \uAD00\uB9AC'}</Text>
              <Badge variant="light" color="blue" size="lg">{cases.length}</Badge>
            </Group>
            <Button leftSection={<IconPlus size={16} />} onClick={() => openModal('createCase')}>
              {'\uC0C8 \uC0AC\uAC74'}
            </Button>
          </Group>

          {/* \uAC80\uC0C9 + \uD544\uD130 */}
          <TextInput
            placeholder={'\uC758\uB8B0\uC778\uBA85, \uC0AC\uAC74\uBC88\uD638, \uBC95\uC6D0, \uD0DC\uADF8...'}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />

          <Group gap="xs">
            {STATUS_FILTERS.map((f) => {
              const count = f.value ? cases.filter((c) => c.status === f.value).length : cases.length
              return (
                <Button
                  key={f.label}
                  variant={statusFilter === f.value ? 'filled' : 'default'}
                  size="xs"
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label} ({count})
                </Button>
              )
            })}
          </Group>

          {storeError && <Alert color="red">{storeError}</Alert>}

          {/* \uBAA9\uB85D */}
          {filtered.length === 0 ? (
            <Stack align="center" py="xl" gap="xs">
              <Text c="dimmed">
                {cases.length === 0
                  ? '\uC544\uC9C1 \uB4F1\uB85D\uB41C \uC0AC\uAC74\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'
                  : '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}
              </Text>
              {cases.length === 0 && (
                <Button variant="subtle" onClick={() => openModal('createCase')}>
                  {'\uCCAB \uBC88\uC9F8 \uC0AC\uAC74 \uB4F1\uB85D\uD558\uAE30'}
                </Button>
              )}
            </Stack>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {filtered.map((c) => (
                <CaseCard
                  key={c.id}
                  caseData={c}
                  onClick={() => navigate(`/case/${c.id}`)}
                  onEdit={(data) => openModal('editCase', data)}
                  onDelete={(data) => openModal('deleteConfirm', data)}
                />
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Container>

      <Modal isOpen={isModalOpen && modalType === 'createCase'} onClose={closeModal} title={'\uC0C8 \uC0AC\uAC74 \uB4F1\uB85D'}>
        <CaseForm onSubmit={handleCreate} onCancel={closeModal} />
      </Modal>
      <Modal isOpen={isModalOpen && modalType === 'editCase'} onClose={closeModal} title={'\uC0AC\uAC74 \uC218\uC815'}>
        <CaseForm initialData={modalData} onSubmit={handleEdit} onCancel={closeModal} />
      </Modal>
      <Modal isOpen={isModalOpen && modalType === 'deleteConfirm'} onClose={closeModal} title={'\uC0AD\uC81C \uD655\uC778'}>
        <Stack>
          <Text size="sm" c="dimmed">
            <Text span fw={600}>{modalData?.clientName}</Text>
            {modalData?.caseNumber && ` (${modalData.caseNumber})`}
            {'\uC744(\uB97C) \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C? \uC774 \uC791\uC5C5\uC740 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.'}
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={closeModal}>{'\uCDE8\uC18C'}</Button>
            <Button color="red" onClick={handleDelete}>{'\uC0AD\uC81C'}</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
