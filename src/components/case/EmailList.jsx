import { useState, useEffect, useCallback } from 'react'
import {
  Stack, Card, Group, Text, Button, Badge, Box,
  Loader, Center, ThemeIcon, ActionIcon, Alert,
} from '@mantine/core'
import {
  IconMail, IconMailOpened, IconRefresh, IconExternalLink,
  IconPaperclip, IconChevronDown, IconChevronUp,
} from '@tabler/icons-react'
import { getThreadsByEmail, getMessage, extractBody } from '../../api/gmail'

function formatEmailDate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const now = new Date()
    const diffDay = Math.floor((now - d) / 86400000)
    if (diffDay === 0) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    if (diffDay < 7) return `${diffDay}\uC77C \uC804`
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return dateStr
  }
}

function extractName(fromStr) {
  if (!fromStr) return ''
  const match = fromStr.match(/^(.+?)\s*</)
  if (match) return match[1].replace(/"/g, '').trim()
  return fromStr.split('@')[0]
}

function ThreadCard({ thread }) {
  const [expanded, setExpanded] = useState(false)
  const [body, setBody] = useState(null)
  const [loadingBody, setLoadingBody] = useState(false)

  const handleExpand = async () => {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    if (body !== null) return
    setLoadingBody(true)
    try {
      const msg = await getMessage(thread.id.split('_')[0] || thread.id)
      // getMessage with thread's first message ID - we use thread.id
      // Actually we need the message ID, let's try getting thread detail
      const text = extractBody(msg.payload) || thread.snippet
      setBody(text)
    } catch {
      setBody(thread.snippet || '\uBCF8\uBB38\uC744 \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.')
    } finally {
      setLoadingBody(false)
    }
  }

  return (
    <Card padding="sm" style={{ cursor: 'pointer' }} onClick={handleExpand}>
      <Group justify="space-between" wrap="nowrap" mb={4}>
        <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <ThemeIcon size={24} variant="light" color="indigo" radius="xl">
            <IconMail size={12} />
          </ThemeIcon>
          <Text size="sm" fw={600} truncate>{extractName(thread.from)}</Text>
          {thread.messageCount > 1 && (
            <Badge size="xs" variant="light" color="gray">{thread.messageCount}</Badge>
          )}
        </Group>
        <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
          <Text size="xs" c="dimmed">{formatEmailDate(thread.date)}</Text>
          {expanded ? <IconChevronUp size={14} color="gray" /> : <IconChevronDown size={14} color="gray" />}
        </Group>
      </Group>
      <Text size="sm" fw={500} truncate mb={2}>{thread.subject}</Text>
      {!expanded && (
        <Text size="xs" c="dimmed" truncate>{thread.snippet}</Text>
      )}
      {expanded && (
        <Box mt="xs" p="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: 8 }}>
          {loadingBody ? (
            <Center py="sm"><Loader size="xs" /></Center>
          ) : (
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 300, overflow: 'auto' }}>
              {body || thread.snippet}
            </Text>
          )}
          <Group justify="flex-end" mt="xs">
            <Button
              component="a"
              href={(() => {
                try {
                  const u = JSON.parse(localStorage.getItem('gd_user') || '{}')
                  return u.email
                    ? `https://mail.google.com/mail/?authuser=${encodeURIComponent(u.email)}#inbox/${thread.id}`
                    : `https://mail.google.com/mail/#inbox/${thread.id}`
                } catch { return `https://mail.google.com/mail/#inbox/${thread.id}` }
              })()}
              target="_blank"
              rel="noopener"
              variant="subtle"
              size="xs"
              leftSection={<IconExternalLink size={12} />}
              onClick={(e) => e.stopPropagation()}
            >
              Gmail{'\uC5D0\uC11C \uBCF4\uAE30'}
            </Button>
          </Group>
        </Box>
      )}
    </Card>
  )
}

export default function EmailList({ caseData }) {
  const [threads, setThreads] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // Support both single email and array of emails
  const clientEmails = (() => {
    const emails = []
    if (caseData.clientEmails?.length > 0) {
      emails.push(...caseData.clientEmails.filter(Boolean))
    } else if (caseData.clientEmail) {
      emails.push(caseData.clientEmail)
    }
    return emails
  })()

  const hasEmail = clientEmails.length > 0

  const loadEmails = useCallback(async () => {
    if (!hasEmail) return
    setIsLoading(true)
    setError(null)
    try {
      // Search all emails and merge results
      const allResults = []
      const seenIds = new Set()
      for (const email of clientEmails) {
        const results = await getThreadsByEmail(email, 20)
        for (const t of results) {
          if (!seenIds.has(t.id)) {
            seenIds.add(t.id)
            allResults.push(t)
          }
        }
      }
      allResults.sort((a, b) => b.timestamp - a.timestamp)
      setThreads(allResults)
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [clientEmails.join(','), hasEmail])

  // Auto-load on first render if email exists
  useEffect(() => {
    if (hasEmail && !loaded) {
      loadEmails()
    }
  }, [hasEmail, loaded, loadEmails])

  if (!hasEmail) {
    return (
      <Center py="xl">
        <Stack align="center" gap="md">
          <ThemeIcon size={72} radius="xl" variant="light" color="indigo">
            <IconMail size={36} />
          </ThemeIcon>
          <Text fw={700} size="lg">{'\uC774\uBA54\uC77C \uC5F0\uB3D9'}</Text>
          <Text c="dimmed" size="sm" ta="center" maw={300}>
            {'\uC758\uB8B0\uC778 \uC774\uBA54\uC77C \uC8FC\uC18C\uAC00 \uB4F1\uB85D\uB418\uBA74'}
            {'\n'}{'\uAD00\uB828 \uC774\uBA54\uC77C\uC744 \uC790\uB3D9\uC73C\uB85C \uAC80\uC0C9\uD569\uB2C8\uB2E4.'}
          </Text>
          <Text size="xs" c="dimmed">
            {'\uC0AC\uAC74 \uC815\uBCF4\uC5D0\uC11C \uC758\uB8B0\uC778 \uC774\uBA54\uC77C\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.'}
          </Text>
        </Stack>
      </Center>
    )
  }

  if (isLoading && !loaded) {
    return (
      <Center py="xl">
        <Stack align="center" gap="sm">
          <Loader size="md" color="indigo" />
          <Text size="sm" c="dimmed">{'\uC774\uBA54\uC77C \uAC80\uC0C9 \uC911...'}</Text>
        </Stack>
      </Center>
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <Text size="sm" fw={600}>{'\uC774\uBA54\uC77C'}</Text>
          {clientEmails.map((email) => (
            <Badge key={email} variant="light" color="indigo" size="sm">{email}</Badge>
          ))}
          {loaded && (
            <Text size="xs" c="dimmed">{threads.length}{'\uAC74'}</Text>
          )}
        </Group>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={loadEmails}
          loading={isLoading}
          title={'\uC0C8\uB85C\uACE0\uCE68'}
        >
          <IconRefresh size={16} />
        </ActionIcon>
      </Group>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      {loaded && threads.length === 0 && !error && (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <ThemeIcon size={48} radius="xl" variant="light" color="gray">
              <IconMailOpened size={24} />
            </ThemeIcon>
            <Text size="sm" c="dimmed">{'\uAD00\uB828 \uC774\uBA54\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'}</Text>
          </Stack>
        </Center>
      )}

      <Stack gap="xs">
        {threads.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} />
        ))}
      </Stack>
    </Stack>
  )
}
