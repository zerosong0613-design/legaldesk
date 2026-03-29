import { useState, useRef, useMemo, useEffect } from 'react'
import {
  Stack, Group, Text, Button, Textarea, Paper, Card, Badge,
  SegmentedControl, Box, Divider, Select, ActionIcon,
} from '@mantine/core'
import { IconUpload, IconPaperclip, IconTrash, IconUser } from '@tabler/icons-react'
import { parseKakaoChat, textToMemo } from '../../utils/kakaoParser'
import { useCaseStore } from '../../store/caseStore'
import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../auth/useAuth'
import { readCaseDetail, writeCaseDetail } from '../../api/drive'
import { formatDateTime, formatDate } from '../../utils/dateUtils'

function formatShortDate(dateStr) {
  const d = new Date(dateStr)
  const mo = d.getMonth() + 1
  const da = d.getDate()
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h < 12 ? '\uC624\uC804' : '\uC624\uD6C4'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${mo}. ${String(da).padStart(2, '0')}. ${ampm} ${h12}:${m}`
}

function BubbleView({ messages, myName, onDeleteBatch }) {
  if (messages.length === 0) {
    return <Text size="sm" c="dimmed" ta="center" py="xl">{'\uB300\uD654\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4'}</Text>
  }

  // sort all messages by time
  const sorted = [...messages].sort((a, b) => new Date(a.datetime) - new Date(b.datetime))

  // group into batches (preserving sorted order)
  const batchOrder = []
  const batchMap = {}
  for (const msg of sorted) {
    const bid = msg.batchId || '__legacy__'
    if (!batchMap[bid]) {
      batchMap[bid] = []
      batchOrder.push(bid)
    }
    batchMap[bid].push(msg)
  }

  const items = []
  let prevSender = null

  for (let bIdx = 0; bIdx < batchOrder.length; bIdx++) {
    const bid = batchOrder[bIdx]
    const batchMsgs = batchMap[bid]

    // batch header with delete
    items.push(
      <Group key={`bh-${bid}`} justify="center" py={6} mt={bIdx > 0 ? 12 : 0}>
        <Divider style={{ flex: 1 }} color="indigo.2" />
        <Group gap={4}>
          <Badge size="xs" variant="light" color="indigo">
            {bIdx === 0 ? `\uB300\uD654 ${batchMsgs.length}\uAC74` : `\uCD94\uAC00 ${batchMsgs.length}\uAC74`}
          </Badge>
          {onDeleteBatch && (
            <ActionIcon
              variant="subtle" color="red" size={18}
              onClick={() => onDeleteBatch(bid)}
              title={'\uC774 \uB300\uD654 \uC0AD\uC81C'}
            >
              <IconTrash size={11} />
            </ActionIcon>
          )}
        </Group>
        <Divider style={{ flex: 1 }} color="indigo.2" />
      </Group>
    )
    prevSender = null

    for (let i = 0; i < batchMsgs.length; i++) {
      const msg = batchMsgs[i]
      const isMe = myName && msg.sender === myName
      const showHeader = msg.sender !== prevSender
      const isFile = msg.hasAttachment

      items.push(
        <Box
          key={msg.id || `${bid}-${i}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMe ? 'flex-end' : 'flex-start',
            marginTop: showHeader ? 12 : 3,
          }}
        >
          {showHeader && (
            <Text size="xs" c="dimmed" mb={3}>
              <Text span fw={600} c={isMe ? 'indigo.7' : 'dark.5'}>{msg.sender}</Text>
              {' \u00B7 '}{formatShortDate(msg.datetime)}
            </Text>
          )}
          <Box
            py={8}
            px={14}
            style={{
              maxWidth: '80%',
              borderRadius: 12,
              borderTopRightRadius: isMe && showHeader ? 4 : 12,
              borderTopLeftRadius: !isMe && showHeader ? 4 : 12,
              backgroundColor: isMe ? '#cce5ff' : '#e8f4fd',
            }}
          >
            {isFile ? (
              <Group gap={4}>
                <IconPaperclip size={13} color="#6b7280" />
                <Text size="sm" c="dark.6">{msg.message}</Text>
              </Group>
            ) : (
              <Text size="sm" c="dark.7" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.55 }}>
                {msg.message}
              </Text>
            )}
          </Box>
        </Box>
      )

      prevSender = msg.sender
    }
  }

  return <Stack gap={0}>{items}</Stack>
}

function RawView({ messages }) {
  return (
    <Card padding={0} mah={500} style={{ overflowY: 'auto' }}>
      {messages.map((msg, i) => (
        <div
          key={msg.id || i}
          style={{
            padding: '10px 16px',
            borderBottom: i < messages.length - 1 ? '1px solid var(--mantine-color-gray-1)' : 'none',
          }}
        >
          <Group gap="xs" mb={2}>
            <Text size="sm" fw={500} c={msg.isFromClient ? 'indigo' : undefined}>
              {msg.sender}
              {msg.isFromClient && <Text span size="xs" c="indigo.4" ml={4}>{'\uC758\uB8B0\uC778'}</Text>}
            </Text>
            <Text size="xs" c="dimmed" ff="monospace">{formatDateTime(msg.datetime)}</Text>
          </Group>
          <Text size="sm" c="dimmed">
            {msg.message}
            {msg.hasAttachment && <Badge color="orange" variant="light" size="xs" ml="xs">{'\uCCA8\uBD80'}</Badge>}
          </Text>
        </div>
      ))}
    </Card>
  )
}

export default function KakaoParser({ caseData }) {
  const { loadCaseDetail } = useCaseStore()
  const { showToast } = useUiStore()
  const { user } = useAuthStore()
  const fileInputRef = useRef(null)

  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [view, setView] = useState('bubble')

  const kakaoMessages = caseData.kakaoMessages || []

  // extract unique sender names
  const senderNames = useMemo(() => {
    const names = new Set()
    for (const msg of kakaoMessages) {
      if (msg.sender) names.add(msg.sender)
    }
    return [...names]
  }, [kakaoMessages])

  // auto-detect default myName: localStorage > Google name match > first non-client sender
  const defaultMyName = useMemo(() => {
    const saved = localStorage.getItem('kt_my_name')
    if (saved && senderNames.includes(saved)) return saved
    const googleName = user?.name || ''
    if (googleName && senderNames.some((n) => n.includes(googleName) || googleName.includes(n))) {
      return senderNames.find((n) => n.includes(googleName) || googleName.includes(n))
    }
    // pick the sender who is NOT the client
    const clientName = caseData.clientName || ''
    const nonClient = senderNames.find((n) => !clientName || !n.includes(clientName))
    return nonClient || senderNames[0] || ''
  }, [senderNames, user, caseData.clientName])

  const [myName, setMyName] = useState(defaultMyName)

  useEffect(() => {
    if (!myName && defaultMyName) {
      setMyName(defaultMyName)
      localStorage.setItem('kt_my_name', defaultMyName)
    }
  }, [defaultMyName])

  const handleMyNameChange = (val) => {
    setMyName(val || '')
    if (val) {
      localStorage.setItem('kt_my_name', val)
    } else {
      localStorage.removeItem('kt_my_name')
    }
  }

  const handleParse = () => {
    if (!text.trim()) return
    const messages = parseKakaoChat(text, caseData.clientName)
    if (messages.length === 0) {
      setPreview({ type: 'memo', data: textToMemo(text), count: 0 })
    } else {
      setPreview({ type: 'messages', data: messages, count: messages.length })
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setText(ev.target.result)
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!preview) return
    setIsSaving(true)
    try {
      const detail = await readCaseDetail(caseData.driveFileId)
      if (preview.type === 'messages') {
        const batchId = `batch-${Date.now()}`
        const tagged = preview.data.map((m) => ({ ...m, batchId }))
        detail.kakaoMessages = [...(detail.kakaoMessages || []), ...tagged]
      } else {
        detail.memos = [...(detail.memos || []), preview.data]
      }
      await writeCaseDetail(caseData.driveFileId, detail)
      await loadCaseDetail(caseData.id)
      setText('')
      setPreview(null)
      showToast(
        preview.type === 'messages'
          ? `${preview.count}\uAC1C \uBA54\uC2DC\uC9C0\uAC00 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`
          : '\uBA54\uBAA8\uB85C \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.',
        'success'
      )
    } catch (err) {
      showToast(`\uC800\uC7A5 \uC2E4\uD328: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // group messages by batchId for batch management
  const batches = useMemo(() => {
    const groups = []
    let current = null
    for (const msg of kakaoMessages) {
      const bid = msg.batchId || '__legacy__'
      if (!current || current.id !== bid) {
        current = { id: bid, messages: [], importedAt: msg.importedAt || msg.datetime }
        groups.push(current)
      }
      current.messages.push(msg)
    }
    return groups
  }, [kakaoMessages])

  const handleDeleteBatch = async (batchId) => {
    const count = batches.find((b) => b.id === batchId)?.messages.length || 0
    if (!confirm(`\uC774 \uB300\uD654 ${count}\uAC74\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`)) return
    try {
      const detail = await readCaseDetail(caseData.driveFileId)
      if (batchId === '__legacy__') {
        detail.kakaoMessages = (detail.kakaoMessages || []).filter((m) => m.batchId)
      } else {
        detail.kakaoMessages = (detail.kakaoMessages || []).filter((m) => m.batchId !== batchId)
      }
      await writeCaseDetail(caseData.driveFileId, detail)
      await loadCaseDetail(caseData.id)
      showToast(`\uB300\uD654 ${count}\uAC74\uC774 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`, 'success')
    } catch (err) {
      showToast(`\uC0AD\uC81C \uC2E4\uD328: ${err.message}`, 'error')
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm('\uC800\uC7A5\uB41C \uCE74\uCE74\uC624\uD1A1 \uB300\uD654\uB97C \uBAA8\uB450 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return
    try {
      const detail = await readCaseDetail(caseData.driveFileId)
      detail.kakaoMessages = []
      await writeCaseDetail(caseData.driveFileId, detail)
      await loadCaseDetail(caseData.id)
      showToast('\uCE74\uCE74\uC624\uD1A1 \uB300\uD654\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
    } catch (err) {
      showToast(`\uC0AD\uC81C \uC2E4\uD328: ${err.message}`, 'error')
    }
  }

  return (
    <Stack gap="lg">
      {/* input area */}
      <Stack gap="sm">
        <Group justify="space-between">
          <Text size="md" fw={600}>{'\uCE74\uCE74\uC624\uD1A1 \uB300\uD654 \uAC00\uC838\uC624\uAE30'}</Text>
          <Button
            variant="subtle" size="xs"
            leftSection={<IconUpload size={14} />}
            onClick={() => fileInputRef.current?.click()}
          >
            txt {'\uD30C\uC77C \uC5C5\uB85C\uB4DC'}
          </Button>
          <input ref={fileInputRef} type="file" accept=".txt" onChange={handleFileUpload} style={{ display: 'none' }} />
        </Group>

        <Textarea
          value={text}
          onChange={(e) => { setText(e.currentTarget.value); setPreview(null) }}
          placeholder={'\uCE74\uCE74\uC624\uD1A1 \uB300\uD654\uB97C \uBD99\uC5EC\uB123\uAE30 \uD558\uC138\uC694...\n\niOS: 2026\uB144 3\uC6D4 1\uC77C \uC624\uD6C4 2:23, \uD64D\uAE38\uB3D9 : \uBA54\uC2DC\uC9C0\nAndroid: [\uD64D\uAE38\uB3D9] [\uC624\uD6C4 2:23] \uBA54\uC2DC\uC9C0'}
          minRows={6}
          autosize
        />

        <Group justify="flex-end" gap="sm">
          {text.trim() && (
            <Button variant="subtle" color="gray" onClick={() => { setText(''); setPreview(null) }}>{'\uC9C0\uC6B0\uAE30'}</Button>
          )}
          <Button onClick={handleParse} disabled={!text.trim()}>{'\uD30C\uC2F1\uD558\uAE30'}</Button>
        </Group>
      </Stack>

      {/* preview */}
      {preview && (
        <Paper bg="gray.0" p="md" radius="lg">
          <Group justify="space-between" mb="sm">
            <Text size="sm" fw={600}>
              {preview.type === 'messages'
                ? `${preview.count}\uAC1C \uBA54\uC2DC\uC9C0 \uD30C\uC2F1\uB428`
                : '\uD30C\uC2F1 \uC2E4\uD328 \u2014 \uBA54\uBAA8\uB85C \uC800\uC7A5'}
            </Text>
            <Button color="teal" size="xs" onClick={handleSave} loading={isSaving}>Drive{'\uC5D0 \uC800\uC7A5'}</Button>
          </Group>

          {preview.type === 'messages' ? (
            <Stack gap={4} mah={240} style={{ overflowY: 'auto' }}>
              {preview.data.slice(0, 50).map((msg, i) => (
                <div key={i}>
                  <Group gap="xs">
                    <Text size="sm" fw={500} c={msg.isFromClient ? 'indigo' : undefined}>{msg.sender}</Text>
                    <Text size="xs" c="dimmed" ff="monospace">{formatDateTime(msg.datetime)}</Text>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {msg.message}
                    {msg.hasAttachment && <Badge color="orange" variant="light" size="xs" ml="xs">{'\uCCA8\uBD80'}</Badge>}
                  </Text>
                </div>
              ))}
              {preview.data.length > 50 && (
                <Text size="xs" c="dimmed" ta="center" py="xs">...{'\uC678'} {preview.data.length - 50}{'\uAC1C \uBA54\uC2DC\uC9C0'}</Text>
              )}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap', WebkitLineClamp: 5, overflow: 'hidden' }}>
              {preview.data.content}
            </Text>
          )}
        </Paper>
      )}

      {/* saved messages */}
      {kakaoMessages.length > 0 && (
        <div>
          <Group justify="space-between" mb="sm">
            <Group gap="sm">
              <Text size="sm" c="dimmed">{'\uB300\uD654'} {kakaoMessages.length}{'\uAC74'}</Text>
              {/* my name selector */}
              <Select
                size="xs"
                placeholder={'\uB0B4 \uC774\uB984 \uC120\uD0DD'}
                data={senderNames}
                value={myName || null}
                onChange={handleMyNameChange}
                clearable
                leftSection={<IconUser size={12} />}
                w={160}
                styles={{ input: { height: 28 } }}
              />
            </Group>
            <Group gap="xs">
              <SegmentedControl
                size="xs"
                value={view}
                onChange={setView}
                data={[
                  { label: '\uD83D\uDCAC \uB9D0\uD48D\uC120', value: 'bubble' },
                  { label: '\uD83D\uDCC4 \uC6D0\uBB38', value: 'raw' },
                ]}
              />
              <ActionIcon variant="subtle" color="red" size="sm" onClick={handleDeleteAll} title={'\uC804\uCCB4 \uC0AD\uC81C'}>
                <IconTrash size={14} />
              </ActionIcon>
            </Group>
          </Group>

          {view === 'bubble' ? (
            <Card padding="md" mah={500} style={{ overflowY: 'auto', backgroundColor: '#f0f7fb' }}>
              <BubbleView messages={kakaoMessages} myName={myName} onDeleteBatch={handleDeleteBatch} />
            </Card>
          ) : (
            <RawView messages={kakaoMessages} />
          )}
        </div>
      )}

      {kakaoMessages.length === 0 && !preview && !text && (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          {'\uCE74\uCE74\uC624\uD1A1 \uB300\uD654\uB97C \uBD99\uC5EC\uB123\uAC70\uB098 txt \uD30C\uC77C\uC744 \uC5C5\uB85C\uB4DC\uD558\uC138\uC694'}
        </Text>
      )}
    </Stack>
  )
}
