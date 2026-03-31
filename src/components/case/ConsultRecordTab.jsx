import { useState } from 'react'
import { Stack, Group, Text, Center, ActionIcon } from '@mantine/core'
import { IconPlus, IconMessageCircle } from '@tabler/icons-react'
import { useCaseStore } from '../../store/caseStore'
import { useUiStore } from '../../store/uiStore'
import Modal from '../ui/Modal'
import ConsultRecordCard from './ConsultRecordCard'
import ConsultRecordForm from './ConsultRecordForm'
import ConsultRecordDetail from './ConsultRecordDetail'

export default function ConsultRecordTab({ caseData }) {
  const { addConsultationRecord, updateConsultationRecord, deleteConsultationRecord } = useCaseStore()
  const { showToast } = useUiStore()

  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  const records = [...(caseData.consultations || [])].sort(
    (a, b) => new Date(`${b.date}T${b.time || '00:00'}`) - new Date(`${a.date}T${a.time || '00:00'}`)
  )

  const handleAdd = async (data) => {
    try {
      await addConsultationRecord(caseData.id, data)
      showToast('상담 기록이 저장되었습니다.', 'success')
      setShowForm(false)
    } catch (err) {
      showToast(`저장 실패: ${err.message}`, 'error')
    }
  }

  const handleUpdate = async (data) => {
    try {
      await updateConsultationRecord(caseData.id, editingRecord.id, data)
      showToast('상담 기록이 수정되었습니다.', 'success')
      setEditingRecord(null)
      setShowForm(false)
      setShowDetail(false)
    } catch (err) {
      showToast(`수정 실패: ${err.message}`, 'error')
    }
  }

  const handleDelete = async (consultationId) => {
    try {
      await deleteConsultationRecord(caseData.id, consultationId)
      showToast('상담 기록이 삭제되었습니다.', 'success')
      setShowDetail(false)
      setSelectedRecord(null)
    } catch (err) {
      showToast(`삭제 실패: ${err.message}`, 'error')
    }
  }

  const openForm = () => {
    setEditingRecord(null)
    setShowForm(true)
  }

  const openEdit = (record) => {
    setEditingRecord(record)
    setShowForm(true)
    setShowDetail(false)
  }

  const openDetail = (record) => {
    setSelectedRecord(record)
    setShowDetail(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingRecord(null)
  }

  return (
    <>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" fw={600}>
            상담 ({records.length})
          </Text>
          <ActionIcon variant="light" color="indigo" onClick={openForm}>
            <IconPlus size={16} />
          </ActionIcon>
        </Group>

        {records.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconMessageCircle size={40} color="var(--mantine-color-gray-4)" />
              <Text size="sm" c="dimmed">상담 기록이 없습니다</Text>
              <Text size="xs" c="dimmed">+ 버튼을 눌러 상담을 추가하세요</Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="sm">
            {records.map((record) => (
              <ConsultRecordCard
                key={record.id}
                consultation={record}
                onClick={openDetail}
              />
            ))}
          </Stack>
        )}
      </Stack>

      {/* 추가/수정 모달 */}
      <Modal
        isOpen={showForm}
        onClose={closeForm}
        title={editingRecord ? '상담 기록 수정' : '새 상담 기록'}
      >
        <ConsultRecordForm
          initialData={editingRecord}
          onSubmit={editingRecord ? handleUpdate : handleAdd}
          onCancel={closeForm}
        />
      </Modal>

      {/* 상세보기 모달 */}
      <ConsultRecordDetail
        consultation={selectedRecord}
        isOpen={showDetail}
        onClose={() => { setShowDetail(false); setSelectedRecord(null) }}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
    </>
  )
}
