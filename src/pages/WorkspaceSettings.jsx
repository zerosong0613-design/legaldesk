import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Group, Text, Button, Avatar, Card,
  Stack, Container, TextInput, Badge,
  ActionIcon, ThemeIcon, Center, Loader, Alert, Box,
  SimpleGrid, Divider,
} from '@mantine/core'
import {
  IconUsers, IconFolder,
  IconPlus, IconUser, IconBuilding, IconMail, IconRefresh,
  IconLink, IconSearch, IconShieldCheck,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import {
  findSharedLegalDeskFolders,
  findMyLegalDeskFolders,
  getFolderOwner,
  shareFolderWithEmail,
  listFolderPermissions,
} from '../api/drive'
import { useUiStore } from '../store/uiStore'

function WorkspaceCard({ ws, isCurrent, onSelect }) {
  const isOwn = ws.type === 'own'
  return (
    <Card
      padding="md"
      withBorder={isCurrent}
      style={{
        borderColor: isCurrent ? 'var(--mantine-color-indigo-5)' : undefined,
        borderWidth: isCurrent ? 2 : undefined,
        cursor: isCurrent ? 'default' : 'pointer',
      }}
      onClick={isCurrent ? undefined : onSelect}
    >
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <ThemeIcon
            size={32}
            radius="xl"
            variant="light"
            color={isOwn ? 'indigo' : 'teal'}
          >
            {isOwn ? <IconUser size={16} /> : <IconBuilding size={16} />}
          </ThemeIcon>
          <Box>
            <Text size="sm" fw={600}>
              {ws.label || (isOwn ? '\uB0B4 \uC791\uC5C5\uACF5\uAC04' : '\uACF5\uC720 \uC791\uC5C5\uACF5\uAC04')}
            </Text>
            {ws.ownerName && (
              <Text size="xs" c="dimmed">{ws.ownerName}{'\uB2D8\uC758 \uC791\uC5C5\uACF5\uAC04'}</Text>
            )}
          </Box>
        </Group>
        {isCurrent && (
          <Badge color="indigo" variant="light" size="sm">{'\uD604\uC7AC'}</Badge>
        )}
      </Group>
      {ws.ownerEmail && (
        <Group gap={4}>
          <IconMail size={12} color="gray" />
          <Text size="xs" c="dimmed">{ws.ownerEmail}</Text>
        </Group>
      )}
      {!isCurrent && (
        <Button variant="light" size="xs" mt="sm" fullWidth>
          {'\uC774 \uC791\uC5C5\uACF5\uAC04\uC73C\uB85C \uC804\uD658'}
        </Button>
      )}
    </Card>
  )
}

export default function WorkspaceSettings() {
  const navigate = useNavigate()
  const { workspace, switchWorkspace, driveRootId } = useCaseStore()
  const { showToast } = useUiStore()

  const [sharedFolders, setSharedFolders] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('writer')
  const [isInviting, setIsInviting] = useState(false)

  const [permissions, setPermissions] = useState([])
  const [isLoadingPerms, setIsLoadingPerms] = useState(false)

  const [isSwitching, setIsSwitching] = useState(false)

  const isOwnWorkspace = !workspace || workspace.type === 'own'

  const searchSharedFolders = async () => {
    setIsSearching(true)
    setSearchError(null)
    try {
      const folders = await findSharedLegalDeskFolders()
      const enriched = []
      for (const f of folders) {
        try {
          const info = await getFolderOwner(f.id)
          const owner = info.owners?.[0]
          enriched.push({
            id: f.id,
            name: f.name,
            ownerName: owner?.displayName || '',
            ownerEmail: owner?.emailAddress || '',
            ownerPhoto: owner?.photoLink || '',
          })
        } catch {
          enriched.push({ id: f.id, name: f.name, ownerName: '', ownerEmail: '' })
        }
      }
      setSharedFolders(enriched)
      setHasSearched(true)
    } catch (err) {
      setSearchError(err.message)
    } finally {
      setIsSearching(false)
    }
  }

  const loadPermissions = async () => {
    if (!driveRootId || !isOwnWorkspace) return
    setIsLoadingPerms(true)
    try {
      const perms = await listFolderPermissions(driveRootId)
      setPermissions(perms)
    } catch {
      // ignore
    } finally {
      setIsLoadingPerms(false)
    }
  }

  useEffect(() => {
    loadPermissions()
  }, [driveRootId])

  const handleSwitch = async (config) => {
    setIsSwitching(true)
    try {
      await switchWorkspace(config)
      showToast('\uC791\uC5C5\uACF5\uAC04\uC774 \uC804\uD658\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    } catch (err) {
      showToast(`\uC804\uD658 \uC2E4\uD328: ${err.message}`, 'error')
    } finally {
      setIsSwitching(false)
    }
  }

  const handleSwitchToOwn = () => {
    handleSwitch({ type: 'own', rootId: null, label: '\uB0B4 \uC791\uC5C5\uACF5\uAC04' })
  }

  const handleSwitchToShared = (folder) => {
    handleSwitch({
      type: 'shared',
      rootId: folder.id,
      label: `${folder.ownerName || 'Unknown'}\uB2D8\uC758 \uC791\uC5C5\uACF5\uAC04`,
      ownerName: folder.ownerName,
      ownerEmail: folder.ownerEmail,
    })
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !driveRootId) return
    setIsInviting(true)
    try {
      await shareFolderWithEmail(driveRootId, inviteEmail.trim(), inviteRole)
      showToast(`${inviteEmail}\uC744(\uB97C) \uCD08\uB300\uD588\uC2B5\uB2C8\uB2E4.`, 'success')
      setInviteEmail('')
      await loadPermissions()
    } catch (err) {
      showToast(`\uCD08\uB300 \uC2E4\uD328: ${err.message}`, 'error')
    } finally {
      setIsInviting(false)
    }
  }

  const roleLabel = (role) => {
    switch (role) {
      case 'owner': return '\uC18C\uC720\uC790'
      case 'writer': return '\uD3B8\uC9D1\uC790'
      case 'reader': return '\uBDF0\uC5B4'
      case 'commenter': return '\uB313\uAE00\uC791\uC131\uC790'
      default: return role
    }
  }

  const roleColor = (role) => {
    switch (role) {
      case 'owner': return 'indigo'
      case 'writer': return 'teal'
      case 'reader': return 'gray'
      default: return 'gray'
    }
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        {/* \uD5E4\uB354 */}
        <Group gap="xs">
          <IconUsers size={22} color="var(--mantine-color-orange-6)" />
          <Text size="lg" fw={700}>{'\uC791\uC5C5\uACF5\uAC04 \uC124\uC815'}</Text>
        </Group>

        {isSwitching && (
          <Center py="xl">
            <Stack align="center" gap="sm">
              <Loader size="md" color="indigo" />
              <Text size="sm" c="dimmed">{'\uC791\uC5C5\uACF5\uAC04 \uC804\uD658 \uC911...'}</Text>
            </Stack>
          </Center>
        )}

        {!isSwitching && (
          <>
            {/* PC: 2\uCEEC\uB7FC \uB808\uC774\uC544\uC6C3 / \uBAA8\uBC14\uC77C: 1\uCEEC\uB7FC */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {/* \uC67C\uCABD: \uD604\uC7AC \uC791\uC5C5\uACF5\uAC04 + \uC9C1\uC6D0 \uCD08\uB300 */}
              <Stack gap="lg">
                {/* \uD604\uC7AC \uC791\uC5C5\uACF5\uAC04 */}
                <Card padding="lg">
                  <Group gap="xs" mb="md">
                    <ThemeIcon size={24} variant="light" color="indigo" radius="xl">
                      <IconFolder size={14} />
                    </ThemeIcon>
                    <Text fw={600}>{'\uD604\uC7AC \uC791\uC5C5\uACF5\uAC04'}</Text>
                  </Group>

                  <Card padding="md" bg="indigo.0" withBorder style={{ borderColor: 'var(--mantine-color-indigo-3)' }}>
                    <Group justify="space-between" wrap="wrap" gap="sm">
                      <Group gap="xs">
                        <ThemeIcon
                          size={36}
                          radius="xl"
                          variant="light"
                          color={isOwnWorkspace ? 'indigo' : 'teal'}
                        >
                          {isOwnWorkspace ? <IconUser size={18} /> : <IconBuilding size={18} />}
                        </ThemeIcon>
                        <Box>
                          <Text fw={600}>
                            {workspace?.label || '\uB0B4 \uC791\uC5C5\uACF5\uAC04'}
                          </Text>
                          {workspace?.ownerEmail && (
                            <Text size="xs" c="dimmed">{workspace.ownerEmail}</Text>
                          )}
                          <Text size="xs" c="dimmed">
                            {isOwnWorkspace
                              ? '\uB0B4 Google Drive\uC5D0 \uB370\uC774\uD130 \uC800\uC7A5'
                              : '\uACF5\uC720\uBC1B\uC740 Drive \uD3F4\uB354\uC5D0 \uC5F0\uACB0\uB428'}
                          </Text>
                        </Box>
                      </Group>
                      <Badge color={isOwnWorkspace ? 'indigo' : 'teal'} variant="light">
                        {isOwnWorkspace ? '\uAC1C\uC778' : '\uACF5\uC720'}
                      </Badge>
                    </Group>
                  </Card>

                  {!isOwnWorkspace && (
                    <Button
                      variant="subtle"
                      size="xs"
                      mt="sm"
                      onClick={handleSwitchToOwn}
                    >
                      {'\uB0B4 \uC791\uC5C5\uACF5\uAC04\uC73C\uB85C \uB3CC\uC544\uAC00\uAE30'}
                    </Button>
                  )}
                </Card>

                {/* \uC9C1\uC6D0 \uCD08\uB300 */}
                {isOwnWorkspace && (
                  <Card padding="lg">
                    <Group gap="xs" mb="md">
                      <ThemeIcon size={24} variant="light" color="teal" radius="xl">
                        <IconUsers size={14} />
                      </ThemeIcon>
                      <Text fw={600}>{'\uC9C1\uC6D0 \uCD08\uB300'}</Text>
                    </Group>

                    <Text size="sm" c="dimmed" mb="md">
                      {'\uB2E4\uB978 \uBCC0\uD638\uC0AC\uB098 \uC9C1\uC6D0\uC758 Google \uACC4\uC815\uC744 \uCD08\uB300\uD558\uBA74,'}{' '}
                      {'\uB0B4 \uC791\uC5C5\uACF5\uAC04\uC758 \uC0AC\uAC74 \uB370\uC774\uD130\uB97C \uD568\uAED8 \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}
                    </Text>

                    <Group gap="sm">
                      <TextInput
                        placeholder="email@example.com"
                        leftSection={<IconMail size={14} />}
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.currentTarget.value)}
                        style={{ flex: 1 }}
                      />
                      <Button
                        onClick={handleInvite}
                        loading={isInviting}
                        disabled={!inviteEmail.trim()}
                        leftSection={<IconPlus size={14} />}
                      >
                        {'\uCD08\uB300'}
                      </Button>
                    </Group>

                    <Alert color="blue" variant="light" mt="sm">
                      <Text size="xs">
                        {'\uCD08\uB300\uBC1B\uC740 \uC0AC\uB78C\uC740 LegalDesk \uC571\uC5D0 \uB85C\uADF8\uC778 \uD6C4'}{' '}
                        {'\uC791\uC5C5\uACF5\uAC04 \uC124\uC815\uC5D0\uC11C "\uACF5\uC720\uB41C \uC791\uC5C5\uACF5\uAC04 \uAC80\uC0C9"\uC744 \uB204\uB974\uBA74 \uC5F0\uACB0\uB429\uB2C8\uB2E4.'}
                      </Text>
                    </Alert>

                    {/* \uAD8C\uD55C \uBAA9\uB85D */}
                    {isLoadingPerms ? (
                      <Center py="sm"><Loader size="xs" /></Center>
                    ) : permissions.length > 0 && (
                      <Stack gap="xs" mt="md">
                        <Group justify="space-between">
                          <Text size="xs" fw={600} c="dimmed">{'\uD604\uC7AC \uBA4B\uBC84'}</Text>
                          <ActionIcon variant="subtle" size="xs" onClick={loadPermissions}>
                            <IconRefresh size={12} />
                          </ActionIcon>
                        </Group>
                        {permissions.map((perm) => (
                          <Group key={perm.id} justify="space-between" py={4}>
                            <Group gap="xs">
                              {perm.photoLink ? (
                                <Avatar src={perm.photoLink} size="xs" radius="xl" />
                              ) : (
                                <ThemeIcon size={20} radius="xl" variant="light" color="gray">
                                  <IconUser size={10} />
                                </ThemeIcon>
                              )}
                              <Box>
                                <Text size="xs" fw={500}>
                                  {perm.displayName || perm.emailAddress || '\uC54C \uC218 \uC5C6\uC74C'}
                                </Text>
                                {perm.emailAddress && perm.displayName && (
                                  <Text size="xs" c="dimmed">{perm.emailAddress}</Text>
                                )}
                              </Box>
                            </Group>
                            <Badge size="xs" variant="light" color={roleColor(perm.role)}>
                              {roleLabel(perm.role)}
                            </Badge>
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Card>
                )}
              </Stack>

              {/* \uC624\uB978\uCABD: \uACF5\uC720\uB41C \uC791\uC5C5\uACF5\uAC04 + \uC548\uB0B4 */}
              <Stack gap="lg">
                {/* \uACF5\uC720\uB41C \uC791\uC5C5\uACF5\uAC04 \uAC80\uC0C9 */}
                <Card padding="lg">
                  <Group gap="xs" mb="md">
                    <ThemeIcon size={24} variant="light" color="orange" radius="xl">
                      <IconLink size={14} />
                    </ThemeIcon>
                    <Text fw={600}>{'\uACF5\uC720\uB41C \uC791\uC5C5\uACF5\uAC04'}</Text>
                  </Group>

                  <Text size="sm" c="dimmed" mb="md">
                    {'\uB2E4\uB978 \uBCC0\uD638\uC0AC\uAC00 \uCD08\uB300\uD55C \uC791\uC5C5\uACF5\uAC04\uC774 \uC788\uC73C\uBA74 \uAC80\uC0C9\uD558\uC5EC \uC5F0\uACB0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}
                  </Text>

                  <Button
                    variant="light"
                    onClick={searchSharedFolders}
                    loading={isSearching}
                    leftSection={<IconSearch size={14} />}
                    fullWidth
                  >
                    {'\uACF5\uC720\uB41C \uC791\uC5C5\uACF5\uAC04 \uAC80\uC0C9'}
                  </Button>

                  {searchError && (
                    <Alert color="red" variant="light" mt="sm">{searchError}</Alert>
                  )}

                  {hasSearched && sharedFolders.length === 0 && !searchError && (
                    <Center py="md">
                      <Text size="sm" c="dimmed">{'\uACF5\uC720\uB41C \uC791\uC5C5\uACF5\uAC04\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'}</Text>
                    </Center>
                  )}

                  {sharedFolders.length > 0 && (
                    <Stack gap="sm" mt="md">
                      {sharedFolders.map((folder) => {
                        const isCurrent = workspace?.type === 'shared' && workspace?.rootId === folder.id
                        return (
                          <Card key={folder.id} padding="sm" withBorder={isCurrent} style={{
                            borderColor: isCurrent ? 'var(--mantine-color-teal-5)' : undefined,
                            cursor: isCurrent ? 'default' : 'pointer',
                          }}>
                            <Group justify="space-between" wrap="wrap" gap="sm">
                              <Group gap="xs">
                                {folder.ownerPhoto ? (
                                  <Avatar src={folder.ownerPhoto} size="sm" radius="xl" />
                                ) : (
                                  <ThemeIcon size={28} radius="xl" variant="light" color="teal">
                                    <IconBuilding size={14} />
                                  </ThemeIcon>
                                )}
                                <Box>
                                  <Text size="sm" fw={600}>
                                    {folder.ownerName || 'Unknown'}{'\uB2D8\uC758 \uC791\uC5C5\uACF5\uAC04'}
                                  </Text>
                                  <Text size="xs" c="dimmed">{folder.ownerEmail}</Text>
                                </Box>
                              </Group>
                              {isCurrent ? (
                                <Badge color="teal" variant="light" size="sm">{'\uD604\uC7AC \uC5F0\uACB0\uB428'}</Badge>
                              ) : (
                                <Button
                                  variant="light"
                                  color="teal"
                                  size="xs"
                                  onClick={() => handleSwitchToShared(folder)}
                                >
                                  {'\uC5F0\uACB0'}
                                </Button>
                              )}
                            </Group>
                          </Card>
                        )
                      })}
                    </Stack>
                  )}
                </Card>

                {/* \uC548\uB0B4 */}
                <Card padding="lg">
                  <Group gap="xs" mb="md">
                    <ThemeIcon size={24} variant="light" color="gray" radius="xl">
                      <IconShieldCheck size={14} />
                    </ThemeIcon>
                    <Text fw={600}>{'\uC791\uC5C5\uACF5\uAC04 \uC548\uB0B4'}</Text>
                  </Group>
                  <Stack gap="sm">
                    <Group gap="xs" wrap="nowrap" align="flex-start">
                      <Text size="sm" c="indigo" fw={600} style={{ flexShrink: 0 }}>{'\u2022'}</Text>
                      <Text size="sm" c="dimmed">
                        <Text span fw={500} c="dark">{'\uB0B4 \uC791\uC5C5\uACF5\uAC04'}</Text>
                        {': \uB370\uC774\uD130\uAC00 \uB0B4 Google Drive\uC5D0 \uC800\uC7A5\uB429\uB2C8\uB2E4. \uC678\uBD80 \uC11C\uBC84\uB97C \uC0AC\uC6A9\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.'}
                      </Text>
                    </Group>
                    <Group gap="xs" wrap="nowrap" align="flex-start">
                      <Text size="sm" c="teal" fw={600} style={{ flexShrink: 0 }}>{'\u2022'}</Text>
                      <Text size="sm" c="dimmed">
                        <Text span fw={500} c="dark">{'\uACF5\uC720 \uC791\uC5C5\uACF5\uAC04'}</Text>
                        {': \uB2E4\uB978 \uC0AC\uB78C\uC758 Drive\uC5D0 \uC800\uC7A5\uB41C \uB370\uC774\uD130\uB97C \uD568\uAED8 \uC0AC\uC6A9\uD569\uB2C8\uB2E4.'}
                      </Text>
                    </Group>
                    <Group gap="xs" wrap="nowrap" align="flex-start">
                      <Text size="sm" c="orange" fw={600} style={{ flexShrink: 0 }}>{'\u2022'}</Text>
                      <Text size="sm" c="dimmed">
                        {'\uCD08\uB300\uBC1B\uC740 \uC0AC\uB78C\uC740 \uD3B8\uC9D1 \uAD8C\uD55C\uC73C\uB85C \uC0AC\uAC74 \uC870\uD68C/\uC218\uC815/\uC0DD\uC131\uC774 \uAC00\uB2A5\uD569\uB2C8\uB2E4.'}
                      </Text>
                    </Group>
                    <Group gap="xs" wrap="nowrap" align="flex-start">
                      <Text size="sm" c="gray" fw={600} style={{ flexShrink: 0 }}>{'\u2022'}</Text>
                      <Text size="sm" c="dimmed">
                        {'\uC5B8\uC81C\uB4E0 \uB0B4 \uC791\uC5C5\uACF5\uAC04\uC73C\uB85C \uB3CC\uC544\uC62C \uC218 \uC788\uC2B5\uB2C8\uB2E4.'}
                      </Text>
                    </Group>
                  </Stack>
                </Card>
              </Stack>
            </SimpleGrid>
          </>
        )}
      </Stack>
    </Container>
  )
}
