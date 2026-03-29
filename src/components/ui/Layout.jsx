import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  AppShell, Group, Title, Text, Button, Avatar, Box,
  UnstyledButton, Container, ThemeIcon, Stack, Burger,
  NavLink, Badge, Divider, Tooltip,
} from '@mantine/core'
import {
  IconLogout, IconHome, IconScale, IconFileText,
  IconReceipt, IconUsers, IconBuilding, IconCalendar,
  IconMenu2, IconChevronLeft,
} from '@tabler/icons-react'
import { useAuthStore } from '../../auth/useAuth'
import { useCaseStore } from '../../store/caseStore'
import Toast from './Toast'

const NAV_ITEMS = [
  { path: '/', label: '\uB300\uC2DC\uBCF4\uB4DC', icon: IconHome, color: 'indigo' },
  { path: '/billing', label: '\uBE44\uC6A9 \uAD00\uB9AC', icon: IconReceipt, color: 'teal' },
  { path: '/workspace', label: '\uC791\uC5C5\uACF5\uAC04', icon: IconUsers, color: 'orange' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { workspace, cases, consultations } = useCaseStore()
  const [navOpened, setNavOpened] = useState(false)

  const isShared = workspace?.type === 'shared'

  const activeCases = cases.filter((c) => c.status === '\uC9C4\uD589' || c.status === '\uC811\uC218').length
  const activeConsults = consultations.filter((c) => c.status === '\uC9C4\uD589' || c.status === '\uC811\uC218').length

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
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  label={item.label}
                  leftSection={<Icon size={18} />}
                  active={isActive}
                  color={item.color}
                  variant="light"
                  onClick={() => {
                    navigate(item.path)
                    setNavOpened(false)
                  }}
                  rightSection={
                    item.path === '/' ? (
                      <Badge size="xs" variant="light" color="indigo">{activeCases + activeConsults}</Badge>
                    ) : item.path === '/workspace' && isShared ? (
                      <Badge size="xs" variant="dot" color="teal">{'\uACF5\uC720'}</Badge>
                    ) : null
                  }
                />
              )
            })}
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
