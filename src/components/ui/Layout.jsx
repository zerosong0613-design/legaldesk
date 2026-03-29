import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppShell, Group, Title, Text, Button, Avatar, Box,
  UnstyledButton, Container, ThemeIcon, Stack, Burger,
  NavLink, Badge, Divider,
} from '@mantine/core'
import {
  IconLogout, IconHome, IconScale, IconFileText,
  IconReceipt, IconUsers, IconBuilding,
} from '@tabler/icons-react'
import { useAuthStore } from '../../auth/useAuth'
import { useCaseStore } from '../../store/caseStore'
import Toast from './Toast'

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { workspace, cases, consultations } = useCaseStore()
  const [navOpened, setNavOpened] = useState(false)

  const isShared = workspace?.type === 'shared'
  const isDashboard = location.pathname === '/'

  const activeCases = cases.filter((c) => c.status === '\uC9C4\uD589' || c.status === '\uC811\uC218').length
  const activeConsults = consultations.filter((c) => c.status === '\uC9C4\uD589' || c.status === '\uC811\uC218').length

  const handleNavCases = () => {
    navigate('/cases')
    setNavOpened(false)
  }

  const handleNavConsultations = () => {
    navigate('/consultations')
    setNavOpened(false)
  }

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 220,
        breakpoint: 'sm',
        collapsed: { mobile: !navOpened, desktop: !navOpened },
      }}
      bg="#f0f2f5"
    >
      <AppShell.Header bg="#1d2124" style={{ borderBottom: 'none' }}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={navOpened}
              onClick={() => setNavOpened((o) => !o)}
              size="sm"
              color="gray.5"
              aria-label={'\uBA54\uB274 \uC5F4\uAE30'}
            />
            <UnstyledButton onClick={() => navigate('/')}>
              <Title order={4} c="white" ff="'Noto Serif KR', serif">LegalDesk</Title>
            </UnstyledButton>
            {isShared && (
              <Badge color="teal" variant="light" size="sm" leftSection={<IconBuilding size={10} />}>
                {workspace.label || '\uACF5\uC720'}
              </Badge>
            )}
          </Group>
          <Group gap="sm">
            {user?.picture && <Avatar src={user.picture} size="sm" radius="xl" />}
            <Text size="sm" c="gray.4" visibleFrom="sm">{user?.name}</Text>
            <Button
              variant="subtle"
              color="gray"
              size="xs"
              leftSection={<IconLogout size={14} />}
              onClick={logout}
              styles={{ root: { color: 'var(--mantine-color-gray-5)' } }}
            >
              {'\uB85C\uADF8\uC544\uC6C3'}
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar bg="white" p="xs">
        <AppShell.Section grow>
          <Stack gap={2}>
            {/* \uB300\uC2DC\uBCF4\uB4DC */}
            <NavLink
              label={'\uB300\uC2DC\uBCF4\uB4DC'}
              leftSection={<IconHome size={18} />}
              active={isDashboard}
              color="indigo"
              variant="light"
              onClick={() => {
                navigate('/')
                setNavOpened(false)
              }}
            />

            <Divider my={6} label={'\uC5C5\uBB34'} labelPosition="left" fz="xs" />

            {/* \uC0AC\uAC74 \uAD00\uB9AC */}
            <NavLink
              label={'\uC0AC\uAC74 \uAD00\uB9AC'}
              leftSection={<IconScale size={18} />}
              active={location.pathname === '/cases'}
              color="blue"
              variant="light"
              onClick={handleNavCases}
              rightSection={
                <Badge size="xs" variant="light" color="blue">{activeCases}</Badge>
              }
            />

            {/* \uC790\uBB38 \uAD00\uB9AC */}
            <NavLink
              label={'\uC790\uBB38 \uAD00\uB9AC'}
              leftSection={<IconFileText size={18} />}
              active={location.pathname === '/consultations'}
              color="grape"
              variant="light"
              onClick={handleNavConsultations}
              rightSection={
                <Badge size="xs" variant="light" color="grape">{activeConsults}</Badge>
              }
            />

            <Divider my={6} label={'\uAD00\uB9AC'} labelPosition="left" fz="xs" />

            {/* \uBE44\uC6A9 \uAD00\uB9AC */}
            <NavLink
              label={'\uBE44\uC6A9 \uAD00\uB9AC'}
              leftSection={<IconReceipt size={18} />}
              active={location.pathname === '/billing'}
              color="teal"
              variant="light"
              onClick={() => {
                navigate('/billing')
                setNavOpened(false)
              }}
            />

            {/* \uC791\uC5C5\uACF5\uAC04 */}
            <NavLink
              label={'\uC791\uC5C5\uACF5\uAC04'}
              leftSection={<IconUsers size={18} />}
              active={location.pathname === '/workspace'}
              color="orange"
              variant="light"
              onClick={() => {
                navigate('/workspace')
                setNavOpened(false)
              }}
              rightSection={
                isShared ? <Badge size="xs" variant="dot" color="teal">{'\uACF5\uC720'}</Badge> : null
              }
            />
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <Divider mb="xs" />
          <Box px="xs" pb="xs">
            <Text size="xs" c="dimmed" mb={4}>{'\uD604\uC7AC \uC791\uC5C5\uACF5\uAC04'}</Text>
            <Group gap="xs">
              <ThemeIcon
                size={20}
                radius="xl"
                variant="light"
                color={isShared ? 'teal' : 'indigo'}
              >
                {isShared ? <IconBuilding size={10} /> : <IconUsers size={10} />}
              </ThemeIcon>
              <Text size="xs" fw={500} truncate style={{ flex: 1 }}>
                {workspace?.label || '\uB0B4 \uC791\uC5C5\uACF5\uAC04'}
              </Text>
            </Group>
            {isShared && workspace.ownerEmail && (
              <Text size="xs" c="dimmed" mt={2} pl={28}>{workspace.ownerEmail}</Text>
            )}
          </Box>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {children}
      </AppShell.Main>

      <Toast />
    </AppShell>
  )
}
