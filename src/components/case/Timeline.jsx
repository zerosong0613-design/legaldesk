import { useMemo, useState } from 'react'
import {
  Text, TextInput, Button, Group, Card, Badge,
  Stack, ActionIcon, ThemeIcon, Box,
} from '@mantine/core'
import { IconScale, IconMessageCircle, IconNote, IconX, IconPaperclip } from '@tabler/icons-react'
import { useCaseStore } from '../../store/caseStore'
import { useUiStore } from '../../store/uiStore'
import { readCaseDetail, writeCaseDetail } from '../../api/drive'
import { formatDateTime, formatDate, parseCalendarTitle } from '../../utils/dateUtils'

const ICON_CONFIG = {
  hearing: { color: 'indigo', icon: IconScale, label: '\uAE30\uC77C' },
  kakao: { color: 'yellow', icon: IconMessageCircle, label: '\uCE74\uD1A1' },
  memo: { color: 'teal', icon: IconNote, label: '\uBA54\uBAA8' },
}

function groupByDate(items) {
  const groups = {}
  for (const item of items) {
    const date = formatDate(item.datetime)
    if (!groups[date]) groups[date] = []
    groups[date].push(item)
  }
  return Object.entries(groups).sort((a, b) => (a[0] > b[0] ? -1 : 1))
}

export default function Timeline({ caseData }) {
  const { loadCaseDetail } = useCaseStore()
  const { showToast } = useUiStore()
  const [memoText, setMemoText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const allItems = useMemo(() => {
    const items = []
    for (const h of caseData.hearings || []) {
      const hasCalendarNote = h.note && h.note.startsWith('[\uCE98\uB9B0\uB354 \uAC00\uC838\uC624\uAE30]')
      let title, subtitle
      if (hasCalendarNote) {
        const parsed = parseCalendarTitle(h.note.replace(/^\[.+?\]\s*/, ''))
        title = parsed.type || h.type
        subtitle = parsed.location || ''
      } else {
        title = h.type
        subtitle = [h.court, h.room].filter(Boolean).join(' ')
      }
      items.push({
        type: 'hearing', datetime: h.datetime,
        title: `${title}\uAE30\uC77C`,
        subtitle,
        content: hasCalendarNote ? '' : (h.note || ''),
        id: h.id,
      })
    }
    // kakao: group by date and show summary instead of individual messages
    const kakaoByDate = {}
    for (const k of caseData.kakaoMessages || []) {
      const dateKey = formatDate(k.datetime)
      if (!kakaoByDate[dateKey]) kakaoByDate[dateKey] = { messages: [], senders: new Set(), first: k }
      kakaoByDate[dateKey].messages.push(k)
      kakaoByDate[dateKey].senders.add(k.sender)
    }
    for (const [, group] of Object.entries(kakaoByDate)) {
      const senderList = [...group.senders].join(', ')
      const lastMsg = group.messages[group.messages.length - 1]
      items.push({
        type: 'kakao', datetime: group.first.datetime,
        title: `\uCE74\uCE74\uC624\uD1A1 \uB300\uD654 ${group.messages.length}\uAC74`,
        subtitle: senderList,
        content: lastMsg.message.length > 50 ? lastMsg.message.slice(0, 50) + '...' : lastMsg.message,
        id: `kakao-summary-${group.first.id}`,
      })
    }
    for (const m of caseData.memos || []) {
      items.push({
        type: 'memo', datetime: m.datetime,
        title: '\uBA54\uBAA8', subtitle: '',
        content: m.content, id: m.id,
      })
    }
    return items.sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
  }, [caseData])

  const dateGroups = useMemo(() => groupByDate(allItems), [allItems])

  const handleAddMemo = async () => {
    if (!memoText.trim()) return
    setIsSaving(true)
    try {
      const newMemo = {
        id: `m-${Date.now()}`, datetime: new Date().toISOString(),
        content: memoText.trim(), createdAt: new Date().toISOString(),
      }
      const detail = await readCaseDetail(caseData.driveFileId)
      detail.memos = [...(detail.memos || []), newMemo]
      await writeCaseDetail(caseData.driveFileId, detail)
      await loadCaseDetail(caseData.id)
      setMemoText('')
      showToast('\uBA54\uBAA8\uAC00 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    } catch (err) {
      showToast(`\uBA54\uBAA8 \uC800\uC7A5 \uC2E4\uD328: ${err.message}`, 'error')
    } finally { setIsSaving(false) }
  }

  const handleDeleteMemo = async (memoId) => {
    try {
      const detail = await readCaseDetail(caseData.driveFileId)
      detail.memos = (detail.memos || []).filter((m) => m.id !== memoId)
      await writeCaseDetail(caseData.driveFileId, detail)
      await loadCaseDetail(caseData.id)
      showToast('\uBA54\uBAA8\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    } catch (err) {
      showToast(`\uBA54\uBAA8 \uC0AD\uC81C \uC2E4\uD328: ${err.message}`, 'error')
    }
  }

  const renderItem = (item) => {
    const config = ICON_CONFIG[item.type]
    const Icon = config.icon
    const timeStr = formatDateTime(item.datetime).split(' ')[1] || ''

    return (
      <Group key={item.id} gap="sm" py="sm" wrap="nowrap" align="flex-start">
        <ThemeIcon size={32} radius="xl" variant="light" color={config.color}>
          <Icon size={14} />
        </ThemeIcon>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" mb={2} wrap="nowrap">
            <Text size="sm" fw={600} c={item.type === 'kakao' && item.isFromClient ? 'indigo' : undefined}>
              {item.title}
            </Text>
            <Badge color={config.color} variant="light" size="xs">{config.label}</Badge>
            <Text size="xs" c="dimmed" ff="monospace" style={{ marginLeft: 'auto', flexShrink: 0 }}>{timeStr}</Text>
          </Group>
          {item.subtitle && (
            <Text size="xs" c="dimmed" mb={2}>{item.subtitle}</Text>
          )}
          {item.content && (
            <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {item.content}
            </Text>
          )}
        </div>
        {item.type === 'memo' && (
          <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDeleteMemo(item.id)}>
            <IconX size={14} />
          </ActionIcon>
        )}
      </Group>
    )
  }

  return (
    <Stack gap="lg">
      <Group gap="sm">
        <TextInput
          style={{ flex: 1 }}
          placeholder={'\uBA54\uBAA8\uB97C \uC785\uB825\uD558\uC138\uC694... (Enter\uB85C \uC800\uC7A5)'}
          value={memoText}
          onChange={(e) => setMemoText(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddMemo() }
          }}
        />
        <Button onClick={handleAddMemo} disabled={!memoText.trim()} loading={isSaving}>{'\uCD94\uAC00'}</Button>
      </Group>

      {dateGroups.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          {'\uC544\uC9C1 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uAE30\uC77C, \uCE74\uCE74\uC624\uD1A1, \uBA54\uBAA8\uB97C \uCD94\uAC00\uD574\uBCF4\uC138\uC694.'}
        </Text>
      ) : (
        <Stack gap="md">
          {dateGroups.map(([date, items]) => (
            <div key={date}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs" ff="monospace">{date}</Text>
              <Card padding="sm">
                {items.map((item, i) => (
                  <div key={item.id} style={{ borderBottom: i < items.length - 1 ? '1px solid var(--mantine-color-gray-1)' : 'none' }}>
                    {renderItem(item)}
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  )
}
