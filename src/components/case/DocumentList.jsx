import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Stack, Card, Group, Text, Button, Box, TextInput, Textarea,
  Loader, Center, ThemeIcon, ActionIcon, Alert, Breadcrumbs, Anchor,
} from '@mantine/core'
import {
  IconFiles, IconUpload, IconTrash, IconFolder, IconFolderPlus,
  IconExternalLink, IconRefresh, IconFile, IconPhoto,
  IconFileTypePdf, IconFileText, IconFileSpreadsheet,
  IconFileZip, IconMovie, IconNote, IconCheck, IconX,
  IconChevronRight, IconEdit,
} from '@tabler/icons-react'
import {
  listFilesInFolder, uploadFileToDrive, deleteFile,
  createSubFolder, updateFileDescription, getFileMetadata, renameFile,
  createGoogleDoc,
} from '../../api/drive'
import { useCaseStore } from '../../store/caseStore'
import { useUiStore } from '../../store/uiStore'
import Modal from '../ui/Modal'
import { getTemplateList, generateTemplate } from '../../utils/legalTemplates'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

function getFileIcon(mimeType) {
  if (!mimeType) return IconFile
  if (mimeType === FOLDER_MIME) return IconFolder
  if (mimeType.startsWith('image/')) return IconPhoto
  if (mimeType === 'application/pdf') return IconFileTypePdf
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return IconFileSpreadsheet
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.startsWith('text/')) return IconFileText
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('compressed')) return IconFileZip
  if (mimeType.startsWith('video/')) return IconMovie
  return IconFile
}

function getFileIconColor(mimeType) {
  if (!mimeType) return 'gray'
  if (mimeType === FOLDER_MIME) return 'yellow'
  if (mimeType.startsWith('image/')) return 'green'
  if (mimeType === 'application/pdf') return 'red'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'teal'
  if (mimeType.includes('document') || mimeType.includes('word') || mimeType.startsWith('text/')) return 'blue'
  if (mimeType.includes('zip')) return 'orange'
  if (mimeType.startsWith('video/')) return 'grape'
  return 'gray'
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  const n = Number(bytes)
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function formatFileDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function FileCard({ file, onNavigateFolder, onDelete, onMemoSaved, onRenamed }) {
  const isFolder = file.mimeType === FOLDER_MIME
  const FileIcon = getFileIcon(file.mimeType)
  const iconColor = getFileIconColor(file.mimeType)
  const { showToast } = useUiStore()

  const [expanded, setExpanded] = useState(false)
  const [memo, setMemo] = useState(file.description || '')
  const [editingMemo, setEditingMemo] = useState(false)
  const [savingMemo, setSavingMemo] = useState(false)

  // Rename state
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(file.name)
  const [savingName, setSavingName] = useState(false)

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === file.name) { setIsRenaming(false); return }
    setSavingName(true)
    try {
      await renameFile(file.id, newName.trim())
      showToast('이름이 변경되었습니다.', 'success')
      setIsRenaming(false)
      if (onRenamed) onRenamed(file.id, newName.trim())
    } catch (err) {
      showToast(`이름 변경 실패: ${err.message}`, 'error')
    } finally {
      setSavingName(false)
    }
  }

  const handleSaveMemo = async () => {
    setSavingMemo(true)
    try {
      await updateFileDescription(file.id, memo.trim())
      setEditingMemo(false)
      showToast('\uBA54\uBAA8\uAC00 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
      if (onMemoSaved) onMemoSaved(file.id, memo.trim())
    } catch (err) {
      showToast(`\uBA54\uBAA8 \uC800\uC7A5 \uC2E4\uD328: ${err.message}`, 'error')
    } finally {
      setSavingMemo(false)
    }
  }

  const handleCancelMemo = () => {
    setMemo(file.description || '')
    setEditingMemo(false)
  }

  return (
    <Card padding="sm">
      <Group wrap="nowrap" gap="sm">
        <ThemeIcon
          size={32} variant="light" color={iconColor} radius="md"
          style={{ cursor: isFolder ? 'pointer' : undefined }}
          onClick={isFolder ? () => onNavigateFolder(file) : undefined}
        >
          <FileIcon size={16} />
        </ThemeIcon>
        <Box
          style={{ flex: 1, minWidth: 0, cursor: isFolder ? 'pointer' : undefined }}
          onClick={isFolder && !isRenaming ? () => onNavigateFolder(file) : !isRenaming ? () => setExpanded(!expanded) : undefined}
        >
          {isRenaming ? (
            <Group gap={4} wrap="nowrap">
              <TextInput
                size="xs"
                value={newName}
                onChange={(e) => setNewName(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsRenaming(false) }}
                style={{ flex: 1 }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <ActionIcon size="sm" color="teal" variant="light" onClick={(e) => { e.stopPropagation(); handleRename() }} loading={savingName}>
                <IconCheck size={12} />
              </ActionIcon>
              <ActionIcon size="sm" color="gray" variant="subtle" onClick={(e) => { e.stopPropagation(); setIsRenaming(false); setNewName(file.name) }}>
                <IconX size={12} />
              </ActionIcon>
            </Group>
          ) : (
          <Text size="sm" fw={500} truncate c={isFolder ? 'yellow.8' : undefined}>
            {file.name}
            {isFolder && <IconChevronRight size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />}
          </Text>
          )}
          <Group gap="xs">
            {!isFolder && file.size && (
              <Text size="xs" c="dimmed">{formatFileSize(file.size)}</Text>
            )}
            <Text size="xs" c="dimmed">{formatFileDate(file.modifiedTime || file.createdTime)}</Text>
            {!isFolder && file.description && !expanded && (
              <Group gap={2}>
                <IconNote size={10} color="var(--mantine-color-teal-5)" />
                <Text size="xs" c="teal" truncate style={{ maxWidth: 150 }}>{file.description}</Text>
              </Group>
            )}
          </Group>
        </Box>
        <Group gap={4}>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setIsRenaming(true); setNewName(file.name) }}
            title="이름 변경"
          >
            <IconEdit size={14} />
          </ActionIcon>
          {!isFolder && (
            <ActionIcon
              variant="subtle"
              color={expanded ? 'teal' : 'gray'}
              size="sm"
              onClick={() => { setExpanded(!expanded); if (!expanded) setEditingMemo(false) }}
              title={'\uBA54\uBAA8'}
            >
              <IconNote size={14} />
            </ActionIcon>
          )}
          {!isFolder && file.webViewLink && (
            <ActionIcon
              component="a"
              href={file.webViewLink}
              target="_blank"
              rel="noopener"
              variant="subtle"
              color="indigo"
              size="sm"
              title={'\uC5F4\uAE30'}
            >
              <IconExternalLink size={14} />
            </ActionIcon>
          )}
          <ActionIcon
            variant="subtle"
            color="red"
            size="sm"
            onClick={() => onDelete(file)}
            title={'\uC0AD\uC81C'}
          >
            <IconTrash size={14} />
          </ActionIcon>
        </Group>
      </Group>

      {/* Memo area */}
      {expanded && !isFolder && (
        <Box mt="xs" p="xs" style={{ backgroundColor: 'var(--mantine-color-gray-0)', borderRadius: 8 }}>
          {editingMemo ? (
            <Stack gap="xs">
              <Textarea
                size="xs"
                placeholder={'\uD30C\uC77C\uC5D0 \uB300\uD55C \uBA54\uBAA8\uB97C \uC785\uB825\uD558\uC138\uC694...'}
                value={memo}
                onChange={(e) => setMemo(e.currentTarget.value)}
                minRows={2}
                autosize
                autoFocus
              />
              <Group justify="flex-end" gap={4}>
                <Button size="xs" variant="subtle" color="gray" onClick={handleCancelMemo} leftSection={<IconX size={12} />}>
                  {'\uCDE8\uC18C'}
                </Button>
                <Button size="xs" onClick={handleSaveMemo} loading={savingMemo} leftSection={<IconCheck size={12} />}>
                  {'\uC800\uC7A5'}
                </Button>
              </Group>
            </Stack>
          ) : (
            <Group
              gap="xs"
              style={{ cursor: 'pointer' }}
              onClick={() => setEditingMemo(true)}
            >
              {memo ? (
                <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{memo}</Text>
              ) : (
                <Text size="xs" c="dimmed" fs="italic">{'\uBA54\uBAA8\uB97C \uCD94\uAC00\uD558\uB824\uBA74 \uD074\uB9AD\uD558\uC138\uC694...'}</Text>
              )}
              <ActionIcon variant="subtle" color="gray" size="xs">
                <IconNote size={12} />
              </ActionIcon>
            </Group>
          )}
        </Box>
      )}
    </Card>
  )
}

export default function DocumentList({ caseData }) {
  const { showToast } = useUiStore()
  const { profile, customTemplates } = useCaseStore()
  const fileInputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  // Folder navigation
  const rootFolderId = caseData.driveFolderId
  const [folderStack, setFolderStack] = useState([]) // [{ id, name }, ...]
  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : rootFolderId

  // 서면 템플릿
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [isCreatingDoc, setIsCreatingDoc] = useState(false)

  const handleCreateTemplate = async (templateId) => {
    const tmpl = TEMPLATE_LIST.find((t) => t.id === templateId)
    if (!tmpl) return
    setIsCreatingDoc(true)
    try {
      const html = generateTemplate(templateId, caseData, profile, customTemplates)
      const title = `[${caseData.caseNumber || caseData.id}] ${tmpl.label}`
      const result = await createGoogleDoc(currentFolderId, title, html)
      showToast(`${tmpl.label} 파일이 생성되었습니다.`, 'success')
      setShowTemplateModal(false)
      await loadFiles()
      // 새로 만든 Google Docs 바로 열기
      if (result.webViewLink) {
        window.open(result.webViewLink, '_blank')
      }
    } catch (err) {
      showToast(`서면 생성 실패: ${err.message}`, 'error')
    } finally {
      setIsCreatingDoc(false)
    }
  }

  // New folder creation
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  const loadFiles = useCallback(async () => {
    if (!currentFolderId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await listFilesInFolder(currentFolderId)
      // Sort: folders first, then files by date
      const sorted = result.sort((a, b) => {
        const aFolder = a.mimeType === FOLDER_MIME ? 0 : 1
        const bFolder = b.mimeType === FOLDER_MIME ? 0 : 1
        if (aFolder !== bFolder) return aFolder - bFolder
        return new Date(b.modifiedTime || 0) - new Date(a.modifiedTime || 0)
      })
      setFiles(sorted)
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [currentFolderId])

  useEffect(() => {
    if (currentFolderId) {
      loadFiles()
    }
  }, [currentFolderId, loadFiles])

  const handleNavigateFolder = (folder) => {
    setFolderStack([...folderStack, { id: folder.id, name: folder.name }])
    setLoaded(false)
  }

  const handleNavigateUp = (index) => {
    // index -1 = root, otherwise slice to index+1
    if (index < 0) {
      setFolderStack([])
    } else {
      setFolderStack(folderStack.slice(0, index + 1))
    }
    setLoaded(false)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setIsCreatingFolder(true)
    try {
      await createSubFolder(currentFolderId, newFolderName.trim())
      setNewFolderName('')
      setShowNewFolder(false)
      showToast('\uD3F4\uB354\uAC00 \uC0DD\uC131\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
      await loadFiles()
    } catch (err) {
      showToast(`\uD3F4\uB354 \uC0DD\uC131 \uC2E4\uD328: ${err.message}`, 'error')
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleUpload = async (e) => {
    const selectedFiles = e.target.files
    if (!selectedFiles?.length || !currentFolderId) return

    setIsUploading(true)
    try {
      let uploadedCount = 0
      for (const file of selectedFiles) {
        await uploadFileToDrive(currentFolderId, file)
        uploadedCount++
      }
      showToast(`${uploadedCount}\uAC1C \uD30C\uC77C\uC774 \uC5C5\uB85C\uB4DC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`, 'success')
      await loadFiles()
    } catch (err) {
      showToast(`\uC5C5\uB85C\uB4DC \uC2E4\uD328: ${err.message}`, 'error')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (file) => {
    const isFolder = file.mimeType === FOLDER_MIME
    const msg = isFolder
      ? `"${file.name}" \uD3F4\uB354\uC640 \uB0B4\uBD80 \uD30C\uC77C\uC744 \uBAA8\uB450 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`
      : `"${file.name}" \uD30C\uC77C\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`
    if (!confirm(msg)) return
    try {
      await deleteFile(file.id)
      showToast(`${isFolder ? '\uD3F4\uB354' : '\uD30C\uC77C'}\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.`, 'success')
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (err) {
      showToast(`\uC0AD\uC81C \uC2E4\uD328: ${err.message}`, 'error')
    }
  }

  const handleMemoSaved = (fileId, memo) => {
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, description: memo } : f))
  }

  const handleRenamed = (fileId, newName) => {
    setFiles((prev) => prev.map((f) => f.id === fileId ? { ...f, name: newName } : f))
  }

  if (!rootFolderId) {
    return (
      <Center py="xl">
        <Stack align="center" gap="md">
          <ThemeIcon size={72} radius="xl" variant="light" color="indigo">
            <IconFiles size={36} />
          </ThemeIcon>
          <Text fw={700} size="lg">{'\uBB38\uC11C \uAD00\uB9AC'}</Text>
          <Text c="dimmed" size="sm" ta="center" maw={300}>
            Drive {'\uD3F4\uB354\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uC0AC\uAC74\uC744 \uB2E4\uC2DC \uC800\uC7A5\uD574\uC8FC\uC138\uC694.'}
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
          <Text size="sm" c="dimmed">{'\uD30C\uC77C \uBAA9\uB85D \uBD88\uB7EC\uC624\uB294 \uC911...'}</Text>
        </Stack>
      </Center>
    )
  }

  const folderCount = files.filter((f) => f.mimeType === FOLDER_MIME).length
  const fileCount = files.length - folderCount

  return (
    <Stack gap="md">
      {/* Header */}
      <Group justify="space-between">
        <Group gap="xs">
          <Text size="sm" fw={600}>{'\uBB38\uC11C'}</Text>
          {loaded && (
            <Text size="xs" c="dimmed">
              {folderCount > 0 && `${folderCount}\uAC1C \uD3F4\uB354, `}{fileCount}{'\uAC1C \uD30C\uC77C'}
            </Text>
          )}
        </Group>
        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            color="grape"
            leftSection={<IconFileText size={14} />}
            onClick={() => setShowTemplateModal(true)}
          >
            서면 작성
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconFolderPlus size={14} />}
            onClick={() => setShowNewFolder(!showNewFolder)}
          >
            {'\uC0C8 \uD3F4\uB354'}
          </Button>
          <Button
            size="xs"
            leftSection={<IconUpload size={14} />}
            onClick={() => fileInputRef.current?.click()}
            loading={isUploading}
          >
            {'\uD30C\uC77C \uC5C5\uB85C\uB4DC'}
          </Button>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={loadFiles}
            loading={isLoading}
            title={'\uC0C8\uB85C\uACE0\uCE68'}
          >
            <IconRefresh size={16} />
          </ActionIcon>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            style={{ display: 'none' }}
          />
        </Group>
      </Group>

      {/* Breadcrumbs */}
      {folderStack.length > 0 && (
        <Breadcrumbs separator={<IconChevronRight size={12} />}>
          <Anchor size="sm" onClick={() => handleNavigateUp(-1)} style={{ cursor: 'pointer' }}>
            {'\uD648'}
          </Anchor>
          {folderStack.map((folder, i) => (
            <Anchor
              key={folder.id}
              size="sm"
              onClick={() => handleNavigateUp(i)}
              style={{ cursor: 'pointer' }}
              fw={i === folderStack.length - 1 ? 600 : 400}
            >
              {folder.name}
            </Anchor>
          ))}
        </Breadcrumbs>
      )}

      {/* New folder input */}
      {showNewFolder && (
        <Card padding="sm" style={{ borderStyle: 'dashed', borderColor: 'var(--mantine-color-yellow-4)' }}>
          <Group gap="xs">
            <ThemeIcon size={28} variant="light" color="yellow" radius="md">
              <IconFolderPlus size={14} />
            </ThemeIcon>
            <TextInput
              size="xs"
              placeholder={'\uD3F4\uB354 \uC774\uB984'}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder() }}
              style={{ flex: 1 }}
              autoFocus
            />
            <Button size="xs" onClick={handleCreateFolder} loading={isCreatingFolder} disabled={!newFolderName.trim()}>
              {'\uC0DD\uC131'}
            </Button>
            <Button size="xs" variant="subtle" color="gray" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>
              {'\uCDE8\uC18C'}
            </Button>
          </Group>
        </Card>
      )}

      {error && (
        <Alert color="red" variant="light">{error}</Alert>
      )}

      {loaded && files.length === 0 && !error && (
        <Center py="xl">
          <Stack align="center" gap="md">
            <ThemeIcon size={48} radius="xl" variant="light" color="gray">
              <IconFiles size={24} />
            </ThemeIcon>
            <Text size="sm" c="dimmed">
              {folderStack.length > 0 ? '\uC774 \uD3F4\uB354\uAC00 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4' : '\uC5C5\uB85C\uB4DC\uB41C \uD30C\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'}
            </Text>
            <Group gap="xs">
              <Button
                variant="light"
                size="sm"
                leftSection={<IconUpload size={14} />}
                onClick={() => fileInputRef.current?.click()}
              >
                {'\uD30C\uC77C \uC5C5\uB85C\uB4DC'}
              </Button>
              <Button
                variant="light"
                size="sm"
                color="yellow"
                leftSection={<IconFolderPlus size={14} />}
                onClick={() => setShowNewFolder(true)}
              >
                {'\uD3F4\uB354 \uB9CC\uB4E4\uAE30'}
              </Button>
            </Group>
          </Stack>
        </Center>
      )}

      {/* File list */}
      <Stack gap="xs">
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onNavigateFolder={handleNavigateFolder}
            onDelete={handleDelete}
            onMemoSaved={handleMemoSaved}
            onRenamed={handleRenamed}
          />
        ))}
      </Stack>

      {/* 서면 템플릿 모달 */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        title="서면 작성"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            사건 정보가 자동으로 채워진 Google Docs 파일이 생성됩니다.
          </Text>
          {getTemplateList(caseData.type, customTemplates).map((tmpl) => (
            <Button
              key={tmpl.id}
              variant="light"
              fullWidth
              justify="flex-start"
              size="md"
              leftSection={<span style={{ fontSize: 18 }}>{tmpl.icon}</span>}
              loading={isCreatingDoc}
              onClick={() => handleCreateTemplate(tmpl.id)}
            >
              {tmpl.label}
            </Button>
          ))}
        </Stack>
      </Modal>
    </Stack>
  )
}
