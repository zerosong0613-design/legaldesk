import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Group, Text, Button, Badge, SimpleGrid, TextInput,
  Stack, Alert, Container, SegmentedControl, Table, ActionIcon,
  Card, Badge as MantineBadge,
} from '@mantine/core'
import {
  IconSearch, IconPlus, IconShieldLock, IconLayoutGrid, IconList,
  IconStar, IconStarFilled, IconEdit, IconTrash,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import CriminalCaseForm from '../components/case/CriminalCaseForm'
import Modal from '../components/ui/Modal'
import BadgeComp from '../components/ui/Badge'

const STAGE_FILTERS = [
  { label: '전체', value: null },
  { label: '경찰수사', value: 'police' },
  { label: '검찰', value: 'prosecution' },
  { label: '기소', value: 'indictment' },
  { label: '재판', value: 'trial' },
  { label: '판결', value: 'verdict' },
]

const STAGE_LABELS = {
  police: '경찰수사', prosecution: '검찰', indictment: '기소',
  trial: '재판', verdict: '판결',
}

function matchesQuery(item, q) {
  return (
    item.clientName?.toLowerCase().includes(q) ||
    item.caseNumber?.toLowerCase().includes(q) ||
    item.criminalInfo?.charges?.toLowerCase().includes(q) ||
    item.court?.toLowerCase().includes(q) ||
    item.criminalInfo?.policeCaseNumber?.toLowerCase().includes(q) ||
    item.criminalInfo?.prosecutionCaseNumber?.toLowerCase().includes(q) ||
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

function CriminalCard({ caseData, onClick, onEdit, onDelete, isFavorite, onToggleFavorite }) {
  const dday = getDday(caseData.nextHearingDate)
  const isUrgent = dday !== null && dday <= 7
  const criminal = caseData.criminalInfo || {}
  const stageLabel = STAGE_LABELS[criminal.currentStage] || '-'
  const posLabel = criminal.position === 'defendant' ? '피의자' : criminal.position === 'complainant' ? '고소인' : ''

  return (
    <Card
      onClick={onClick}
      padding="lg"
      style={{
        cursor: 'pointer',
        borderColor: criminal.detained ? 'var(--mantine-color-red-3)' : isUrgent ? 'var(--mantine-color-red-3)' : undefined,
        boxShadow: criminal.detained ? '0 0 0 1px var(--mantine-color-red-1)' : undefined,
      }}
    >
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" mb={4}>
            <Text size="sm" ff="monospace" c="dimmed">
              {caseData.caseNumber || criminal.policeCaseNumber || '번호 미정'}
            </Text>
            <MantineBadge size="xs" variant="light" color="indigo">{stageLabel}</MantineBadge>
            {criminal.detained && <MantineBadge size="xs" variant="filled" color="red">구속중</MantineBadge>}
            <BadgeComp status={caseData.status} />
          </Group>
          <Text fw={600} truncate>{caseData.clientName}</Text>
          {posLabel && <Text size="xs" c="dimmed">{posLabel}</Text>}
        </div>
        <Group gap={4}>
          {onToggleFavorite && (
            <ActionIcon variant="subtle" color={isFavorite ? 'yellow' : 'gray'} size="sm" onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}>
              {isFavorite ? <IconStarFilled size={14} /> : <IconStar size={14} />}
            </ActionIcon>
          )}
          <ActionIcon variant="subtle" color="gray" size="sm" onClick={(e) => { e.stopPropagation(); onEdit(caseData) }}>
            <IconEdit size={14} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(caseData) }}>
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      </Group>

      {criminal.charges && (
        <Text size="sm" c="dimmed" mb="xs">혐의: {criminal.charges}</Text>
      )}

      <Text size="sm" c="dimmed" mb="xs">
        {caseData.court || criminal.investigationAgency || '-'}
      </Text>

      {caseData.nextHearingDate && (
        <Text size="sm" c={isUrgent ? 'red' : 'dimmed'} fw={isUrgent ? 600 : undefined}>
          다음 기일: {formatDate(caseData.nextHearingDate)}
          {dday !== null && ` (D-${dday})`}
        </Text>
      )}

      {caseData.tags?.length > 0 && (
        <Group gap={4} mt="sm">
          {caseData.tags.map((tag) => (
            <MantineBadge key={tag} variant="light" color="gray" size="xs">{tag}</MantineBadge>
          ))}
        </Group>
      )}
    </Card>
  )
}

export default function CriminalList() {
  const navigate = useNavigate()
  const { cases, createCase, updateCase, deleteCase, error: storeError } = useCaseStore()
  const {
    isModalOpen, modalType, modalData, openModal, closeModal, showToast,
    viewMode, setViewMode, favorites, toggleFavorite,
  } = useUiStore()

  const [stageFilter, setStageFilter] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const criminalCases = useMemo(() => cases.filter((c) => c.type === '형사'), [cases])

  const filtered = useMemo(() => {
    let result = criminalCases
    if (showFavoritesOnly) result = result.filter((c) => favorites.includes(c.id))
    if (stageFilter) result = result.filter((c) => c.criminalInfo?.currentStage === stageFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((c) => matchesQuery(c, q))
    }
    return result.sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 1 : 0
      const bFav = favorites.includes(b.id) ? 1 : 0
      if (bFav !== aFav) return bFav - aFav
      return new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0)
    })
  }, [criminalCases, stageFilter, searchQuery, favorites, showFavoritesOnly])

  const handleCreate = async (data) => {
    const result = await createCase(data)
    if (result) { closeModal(); showToast('형사사건이 등록되었습니다.', 'success') }
  }
  const handleEdit = async (data) => {
    await updateCase(modalData.id, data)
    closeModal(); showToast('형사사건이 수정되었습니다.', 'success')
  }
  const handleDelete = async () => {
    await deleteCase(modalData.id)
    closeModal(); showToast('형사사건이 삭제되었습니다.', 'success')
  }

  return (
    <>
      <Container size="xl" py="lg">
        <Stack gap="lg">
          <Group justify="space-between">
            <Group gap="xs">
              <IconShieldLock size={22} color="var(--mantine-color-red-6)" />
              <Text size="lg" fw={700}>형사사건</Text>
              <Badge variant="light" color="red" size="lg">{criminalCases.length}</Badge>
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
              <Button color="red" leftSection={<IconPlus size={16} />} onClick={() => openModal('createCriminal')}>
                새 형사사건
              </Button>
            </Group>
          </Group>

          <TextInput
            placeholder="의뢰인명, 사건번호, 죄명, 법원..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
          />

          <Group gap="xs">
            <Button
              variant={showFavoritesOnly ? 'filled' : 'default'}
              color="yellow"
              size="xs"
              leftSection={<IconStarFilled size={14} />}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              즐겨찾기
            </Button>
            {STAGE_FILTERS.map((f) => {
              const count = f.value ? criminalCases.filter((c) => c.criminalInfo?.currentStage === f.value).length : criminalCases.length
              return (
                <Button key={f.label} variant={stageFilter === f.value ? 'filled' : 'default'} size="xs" onClick={() => setStageFilter(f.value)}>
                  {f.label} ({count})
                </Button>
              )
            })}
          </Group>

          {storeError && <Alert color="red">{storeError}</Alert>}

          {filtered.length === 0 ? (
            <Stack align="center" py="xl" gap="xs">
              <Text c="dimmed">{criminalCases.length === 0 ? '등록된 형사사건이 없습니다' : '검색 결과가 없습니다'}</Text>
              {criminalCases.length === 0 && (
                <Button variant="subtle" color="red" onClick={() => openModal('createCriminal')}>첫 형사사건 등록하기</Button>
              )}
            </Stack>
          ) : viewMode === 'table' ? (
            <Table.ScrollContainer minWidth={700}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={40}></Table.Th>
                    <Table.Th>사건번호</Table.Th>
                    <Table.Th>의뢰인</Table.Th>
                    <Table.Th>혐의</Table.Th>
                    <Table.Th>단계</Table.Th>
                    <Table.Th>구속</Table.Th>
                    <Table.Th>다음 기일</Table.Th>
                    <Table.Th w={80}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.map((c) => {
                    const cr = c.criminalInfo || {}
                    const dday = getDday(c.nextHearingDate)
                    const isFav = favorites.includes(c.id)
                    return (
                      <Table.Tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/criminal/${c.id}`)}>
                        <Table.Td onClick={(e) => e.stopPropagation()}>
                          <ActionIcon variant="subtle" color={isFav ? 'yellow' : 'gray'} size="sm" onClick={() => toggleFavorite(c.id)}>
                            {isFav ? <IconStarFilled size={16} /> : <IconStar size={16} />}
                          </ActionIcon>
                        </Table.Td>
                        <Table.Td><Text size="sm" ff="monospace">{c.caseNumber || cr.policeCaseNumber || '미정'}</Text></Table.Td>
                        <Table.Td><Text size="sm" fw={500}>{c.clientName}</Text></Table.Td>
                        <Table.Td><Text size="sm" c="dimmed">{cr.charges || '-'}</Text></Table.Td>
                        <Table.Td><MantineBadge size="xs" variant="light" color="indigo">{STAGE_LABELS[cr.currentStage] || '-'}</MantineBadge></Table.Td>
                        <Table.Td>{cr.detained ? <MantineBadge size="xs" variant="filled" color="red">구속</MantineBadge> : <Text size="xs" c="dimmed">불구속</Text>}</Table.Td>
                        <Table.Td>
                          {c.nextHearingDate ? (
                            <Text size="sm" c={dday !== null && dday <= 7 ? 'red' : undefined}>{formatDate(c.nextHearingDate)}{dday !== null && ` (D-${dday})`}</Text>
                          ) : <Text size="sm" c="dimmed">-</Text>}
                        </Table.Td>
                        <Table.Td onClick={(e) => e.stopPropagation()}>
                          <Group gap={4}>
                            <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => openModal('editCriminal', c)}><IconEdit size={14} /></ActionIcon>
                            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => openModal('deleteConfirm', c)}><IconTrash size={14} /></ActionIcon>
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
                <CriminalCard
                  key={c.id}
                  caseData={c}
                  isFavorite={favorites.includes(c.id)}
                  onToggleFavorite={() => toggleFavorite(c.id)}
                  onClick={() => navigate(`/criminal/${c.id}`)}
                  onEdit={(data) => openModal('editCriminal', data)}
                  onDelete={(data) => openModal('deleteConfirm', data)}
                />
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Container>

      <Modal isOpen={isModalOpen && modalType === 'createCriminal'} onClose={closeModal} title="새 형사사건 등록">
        <CriminalCaseForm onSubmit={handleCreate} onCancel={closeModal} />
      </Modal>
      <Modal isOpen={isModalOpen && modalType === 'editCriminal'} onClose={closeModal} title="형사사건 수정">
        <CriminalCaseForm initialData={modalData} onSubmit={handleEdit} onCancel={closeModal} />
      </Modal>
      <Modal isOpen={isModalOpen && modalType === 'deleteConfirm'} onClose={closeModal} title="삭제 확인">
        <Stack>
          <Text size="sm" c="dimmed">
            <Text span fw={600}>{modalData?.clientName}</Text> 형사사건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={closeModal}>취소</Button>
            <Button color="red" onClick={handleDelete}>삭제</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
