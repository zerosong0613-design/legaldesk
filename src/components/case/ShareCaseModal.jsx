import { useState, useEffect } from 'react'
import {
  TextInput, Button, Group, Stack, Text, ActionIcon,
  Badge as MantineBadge, Center, Loader, UnstyledButton, Box,
} from '@mantine/core'
import { IconShare, IconTrash, IconUser, IconMail } from '@tabler/icons-react'
import { useCaseStore } from '../../store/caseStore'
import { useUiStore } from '../../store/uiStore'
import { listFilePermissions } from '../../api/drive'
import { useAuthStore } from '../../auth/useAuth'
import Modal from '../ui/Modal'

const ROLES = [
  { value: 'reader', label: '읽기', color: 'gray' },
  { value: 'writer', label: '편집', color: 'teal' },
]

export default function ShareCaseModal({ caseData, isOpen, onClose }) {
  const { shareCase, unshareCase } = useCaseStore()
  const { showToast } = useUiStore()
  const user = useAuthStore((s) => s.user)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState('reader')
  const [isSharing, setIsSharing] = useState(false)
  const [permissions, setPermissions] = useState([])
  const [isLoadingPerms, setIsLoadingPerms] = useState(false)

  useEffect(() => {
    if (isOpen && caseData?.driveFileId) {
      loadPerms()
    }
  }, [isOpen, caseData?.driveFileId])

  const loadPerms = async () => {
    if (!caseData?.driveFileId) return
    setIsLoadingPerms(true)
    try {
      const perms = await listFilePermissions(caseData.driveFileId)
      // 소유자 제외
      setPermissions(perms.filter((p) => p.role !== 'owner'))
    } catch {
      setPermissions([])
    } finally {
      setIsLoadingPerms(false)
    }
  }

  const handleShare = async () => {
    if (!email.trim()) return
    if (email.trim() === user?.email) {
      showToast('본인에게는 공유할 수 없습니다.', 'error')
      return
    }
    setIsSharing(true)
    try {
      await shareCase(caseData.id, email.trim(), role)
      showToast(`${email}에게 공유했습니다.`, 'success')
      setEmail('')
      await loadPerms()
    } catch (err) {
      showToast(`공유 실패: ${err.message}`, 'error')
    } finally {
      setIsSharing(false)
    }
  }

  const handleUnshare = async (targetEmail) => {
    try {
      await unshareCase(caseData.id, targetEmail)
      showToast(`${targetEmail} 공유를 해제했습니다.`, 'success')
      await loadPerms()
    } catch (err) {
      showToast(`공유 해제 실패: ${err.message}`, 'error')
    }
  }

  const roleBadge = (r) => {
    const config = ROLES.find((x) => x.value === r) || ROLES[0]
    return <MantineBadge variant="light" size="xs" color={config.color}>{config.label}</MantineBadge>
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="사건 공유">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          이 사건의 상세 정보와 첨부파일을 특정 사람에게 공유합니다.
        </Text>

        {/* 이메일 + 역할 + 공유 버튼 */}
        <Group gap="sm" align="flex-end">
          <TextInput
            label="이메일"
            placeholder="email@example.com"
            leftSection={<IconMail size={14} />}
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            style={{ flex: 1 }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleShare() }}
          />
          <div>
            <Text size="sm" fw={500} mb={4}>권한</Text>
            <Group gap={4}>
              {ROLES.map((r) => (
                <UnstyledButton
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1.5px solid ${role === r.value ? `var(--mantine-color-${r.color}-5)` : 'var(--mantine-color-gray-3)'}`,
                    background: role === r.value ? `var(--mantine-color-${r.color}-0)` : 'white',
                    fontSize: 13,
                  }}
                >
                  {r.label}
                </UnstyledButton>
              ))}
            </Group>
          </div>
          <Button
            onClick={handleShare}
            loading={isSharing}
            disabled={!email.trim()}
            leftSection={<IconShare size={14} />}
          >
            공유
          </Button>
        </Group>

        {/* 현재 공유 목록 */}
        {isLoadingPerms ? (
          <Center py="sm"><Loader size="xs" /></Center>
        ) : permissions.length > 0 ? (
          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed">공유 대상</Text>
            {permissions.map((perm) => (
              <Group key={perm.id} justify="space-between" py={4}
                style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}
              >
                <Group gap="xs">
                  <Box
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'var(--mantine-color-gray-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <IconUser size={12} color="var(--mantine-color-gray-6)" />
                  </Box>
                  <div>
                    <Text size="xs" fw={500}>
                      {perm.displayName || perm.emailAddress}
                    </Text>
                    {perm.displayName && (
                      <Text size="xs" c="dimmed">{perm.emailAddress}</Text>
                    )}
                  </div>
                </Group>
                <Group gap="xs">
                  {roleBadge(perm.role)}
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() => handleUnshare(perm.emailAddress)}
                  >
                    <IconTrash size={12} />
                  </ActionIcon>
                </Group>
              </Group>
            ))}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed" ta="center" py="sm">
            아직 공유된 사람이 없습니다
          </Text>
        )}

        {/* sharedWith 표시 (cases.json 기반) */}
        {caseData?.sharedWith?.length > 0 && permissions.length === 0 && (
          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed">이전 공유 기록</Text>
            {caseData.sharedWith.map((s) => (
              <Group key={s.email} justify="space-between" py={4}>
                <Text size="xs">{s.email}</Text>
                {roleBadge(s.role)}
              </Group>
            ))}
          </Stack>
        )}
      </Stack>
    </Modal>
  )
}
