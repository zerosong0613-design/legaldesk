import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Group, Text, Button, Badge, SimpleGrid, TextInput,
  Stack, Alert, Container, SegmentedControl, Table,
  ActionIcon, UnstyledButton,
} from '@mantine/core'
import {
  IconSearch, IconPlus, IconScale, IconLayoutGrid, IconList,
  IconStar, IconStarFilled, IconEdit, IconTrash,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import CaseCard from '../components/case/CaseCard'
import CaseForm from '../components/case/CaseForm'
import Modal from '../components/ui/Modal'
import BadgeComp from '../components/ui/Badge'

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

function getDday(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return null
  return diff
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function CaseList() {
  const navigate = useNavigate()
  const {
    cases, createCase, updateCase, deleteCase,
    error: storeError,
  } = useCaseStore()
  const {
    isModalOpen, modalType, modalData, openModal, closeModal, showToast,
    viewMode, setViewMode, favorites, toggleFavorite,
  } = useUiStore()

  const [statusFilter, setStatusFilter] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const civilCases = useMemo(() => cases.filter((c) => c.type !== '형사'), [cases])

  const filtered = useMemo(() => {
    let result = civilCases
    if (showFavoritesOnly) result = result.filter((c) => favorites.includes(c.id))
    if (statusFilter) result = result.filter((c) => c.status === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) => matchesQuery(c, q))
    }
    // 즐겨찾기 우선 정렬, 그 다음 최근 활동순
    return result.sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 1 : 0
      const bFav = favorites.includes(b.id) ? 1 : 0
      if (bFav !== aFav) return bFav - aFav
      return new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0)
    })
  }, [civilCases, statusFilter, searchQuery, favorites, showFavoritesOnly])

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
              <Badge variant="light" color="blue" size="lg">{civilCases.length}</Badge>
            </Group>
            <Group gap="xs">
              <SegmentedControl
                size="xs"
                value={viewMode}
                onChange={setViewMode}
                data={[
                  { label: <IconLayoutGrid size={16} />, value: 'card' },
                  { label: <IconList size={16} />, value: 'table' },
                ]}
              />
              <Button leftSection={<IconPlus size={16} />} onClick={() => openModal('createCase')}>
                {'\uC0C8 \uC0AC\uAC74'}
              </Button>
            </Group>
          </Group>

          {/* \uAC80\uC0C9 */}
          <TextInput
            placeholder={'\uC758\uB8B0\uC778\uBA85, \uC0AC\uAC74\uBC88\uD638, \uBC95\uC6D0, \uD0DC\uADF8...'}
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />

          {/* \uD544\uD130 */}
          <Group gap="xs">
            <Button
              variant={showFavoritesOnly ? 'filled' : 'default'}
              color="yellow"
              size="xs"
              leftSection={<IconStarFilled size={14} />}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              {'\uC990\uACA8\uCC3E\uAE30'}
            </Button>
            {STATUS_FILTERS.map((f) => {
              const count = f.value ? civilCases.filter((c) => c.status === f.value).length : civilCases.length
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
                {civilCases.length === 0
                  ? '\uC544\uC9C1 \uB4F1\uB85D\uB41C \uC0AC\uAC74\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'
                  : '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}
              </Text>
              {civilCases.length === 0 && (
                <Button variant="subtle" onClick={() => openModal('createCase')}>
                  {'\uCCAB \uBC88\uC9F8 \uC0AC\uAC74 \uB4F1\uB85D\uD558\uAE30'}
                </Button>
              )}
            </Stack>
          ) : viewMode === 'table' ? (
            <Table.ScrollContainer minWidth={700}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}></Table.Th>
                    <Table.Th>{'\uC0AC\uAC74\uBC88\uD638'}</Table.Th>
                    <Table.Th>{'\uC758\uB8B0\uC778'}</Table.Th>
                    <Table.Th>{'\uC720\uD615'}</Table.Th>
                    <Table.Th>{'\uBC95\uC6D0'}</Table.Th>
                    <Table.Th>{'\uC0C1\uD0DC'}</Table.Th>
                    <Table.Th>{'\uB2E4\uC74C \uAE30\uC77C'}</Table.Th>
                    <Table.Th w={80}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.map((c) => {
                    const dday = getDday(c.nextHearingDate)
                    const isFav = favorites.includes(c.id)
                    return (
                      <Table.Tr
                        key={c.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/case/${c.id}`)}
                      >
                        <Table.Td onClick={(e) => e.stopPropagation()}>
                          <ActionIcon
                            variant="subtle"
                            color={isFav ? 'yellow' : 'gray'}
                            size="sm"
                            onClick={() => toggleFavorite(c.id)}
                          >
                            {isFav ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                          </ActionIcon>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" ff="monospace">{c.caseNumber || '\uBC88\uD638 \uBBF8\uC815'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>{c.clientName}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{c.type}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{c.court || '-'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <BadgeComp status={c.status} />
                        </Table.Td>
                        <Table.Td>
                          {c.nextHearingDate ? (
                            <Text size="sm" c={dday !== null && dday <= 7 ? 'red' : undefined} fw={dday !== null && dday <= 7 ? 600 : undefined}>
                              {formatDate(c.nextHearingDate)}
                              {dday !== null && ` (D-${dday})`}
                            </Text>
                          ) : (
                            <Text size="sm" c="dimmed">-</Text>
                          )}
                        </Table.Td>
                        <Table.Td onClick={(e) => e.stopPropagation()}>
                          <Group gap={4}>
                            <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => openModal('editCase', c)}>
                              <IconEdit size={14} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => openModal('deleteConfirm', c)}>
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    )
                  })}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {filtered.map((c) => (
                <CaseCard
                  key={c.id}
                  caseData={c}
                  isFavorite={favorites.includes(c.id)}
                  onToggleFavorite={() => toggleFavorite(c.id)}
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
