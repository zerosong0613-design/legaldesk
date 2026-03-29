import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Stack, Card, Group, Text, Button, Badge, Box,
  Loader, Center, ThemeIcon, ActionIcon, Alert, Progress,
} from '@mantine/core'
import {
  IconFiles, IconUpload, IconTrash, IconDownload,
  IconExternalLink, IconRefresh, IconFile, IconPhoto,
  IconFileTypePdf, IconFileText, IconFileSpreadsheet,
  IconFileZip, IconMovie,
} from '@tabler/icons-react'
import { listFilesInFolder, uploadFileToDrive, deleteFile } from '../../api/drive'
import { useUiStore } from '../../store/uiStore'

function getFileIcon(mimeType) {
  if (!mimeType) return IconFile
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

export default function DocumentList({ caseData }) {
  const { showToast } = useUiStore()
  const fileInputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  const folderId = caseData.driveFolderId

  const loadFiles = useCallback(async () => {
    if (!folderId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await listFilesInFolder(folderId)
      setFiles(result)
      setLoaded(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [folderId])

  useEffect(() => {
    if (folderId && !loaded) {
      loadFiles()
    }
  }, [folderId, loaded, loadFiles])

  const handleUpload = async (e) => {
    const selectedFiles = e.target.files
    if (!selectedFiles?.length || !folderId) return

    setIsUploading(true)
    try {
      let uploadedCount = 0
      for (const file of selectedFiles) {
        await uploadFileToDrive(folderId, file)
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
    if (!confirm(`"${file.name}" \uD30C\uC77C\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?`)) return
    try {
      await deleteFile(file.id)
      showToast('\uD30C\uC77C\uC774 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.', 'success')
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (err) {
      showToast(`\uC0AD\uC81C \uC2E4\uD328: ${err.message}`, 'error')
    }
  }

  if (!folderId) {
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

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <Text size="sm" fw={600}>{'\uBB38\uC11C'}</Text>
          {loaded && (
            <Text size="xs" c="dimmed">{files.length}{'\uAC1C \uD30C\uC77C'}</Text>
          )}
        </Group>
        <Group gap="xs">
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

      {error && (
        <Alert color="red" variant="light">{error}</Alert>
      )}

      {loaded && files.length === 0 && !error && (
        <Center py="xl">
          <Stack align="center" gap="md">
            <ThemeIcon size={48} radius="xl" variant="light" color="gray">
              <IconFiles size={24} />
            </ThemeIcon>
            <Text size="sm" c="dimmed">{'\uC5C5\uB85C\uB4DC\uB41C \uD30C\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4'}</Text>
            <Button
              variant="light"
              size="sm"
              leftSection={<IconUpload size={14} />}
              onClick={() => fileInputRef.current?.click()}
            >
              {'\uCCAB \uBC88\uC9F8 \uD30C\uC77C \uC5C5\uB85C\uB4DC'}
            </Button>
          </Stack>
        </Center>
      )}

      <Stack gap="xs">
        {files.map((file) => {
          const FileIcon = getFileIcon(file.mimeType)
          const iconColor = getFileIconColor(file.mimeType)
          return (
            <Card key={file.id} padding="sm">
              <Group wrap="nowrap" gap="sm">
                <ThemeIcon size={32} variant="light" color={iconColor} radius="md">
                  <FileIcon size={16} />
                </ThemeIcon>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={500} truncate>{file.name}</Text>
                  <Group gap="xs">
                    {file.size && (
                      <Text size="xs" c="dimmed">{formatFileSize(file.size)}</Text>
                    )}
                    <Text size="xs" c="dimmed">{formatFileDate(file.modifiedTime || file.createdTime)}</Text>
                  </Group>
                </Box>
                <Group gap={4}>
                  {file.webViewLink && (
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
                    onClick={() => handleDelete(file)}
                    title={'\uC0AD\uC81C'}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          )
        })}
      </Stack>
    </Stack>
  )
}
