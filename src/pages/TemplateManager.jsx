import { useState, useRef } from 'react'
import {
  Container, Stack, Group, Text, Tabs, Card, Button,
  Textarea, ActionIcon, Alert, SimpleGrid, Box,
  ThemeIcon,
} from '@mantine/core'
import {
  IconFileText, IconEdit, IconRefresh, IconCheck,
  IconScale, IconGavel, IconEye, IconCode,
  IconBrandGoogleDrive, IconDownload, IconUpload,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import { createGoogleDoc, exportGoogleDocAsHtml, deleteFile, uploadFileAsGoogleDoc } from '../api/drive'
import Modal from '../components/ui/Modal'
import {
  CIVIL_TEMPLATES, CRIMINAL_TEMPLATES, CONSULT_TEMPLATES,
  getDefaultTemplate,
} from '../utils/legalTemplates'

export default function TemplateManager() {
  const { customTemplates, saveTemplates, profile, dataFolderId, templatesFolderId } = useCaseStore()
  const { showToast } = useUiStore()

  const [activeTab, setActiveTab] = useState('civil')
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [editHtml, setEditHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Google Docs 편집용 — { templateId: { docId, webViewLink } }
  const [docsMap, setDocsMap] = useState({})
  const [isCreatingDoc, setIsCreatingDoc] = useState(null)
  const [isImporting, setIsImporting] = useState(null)

  // 새 템플릿 만들기
  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const uploadRef = useRef(null)

  const builtinTemplates = activeTab === 'criminal' ? CRIMINAL_TEMPLATES
    : activeTab === 'consult' ? CONSULT_TEMPLATES
    : CIVIL_TEMPLATES
  const categoryKey = activeTab

  // 사용자가 만든 커스텀 템플릿 목록
  const userTemplates = (customTemplates?._userTemplates?.[categoryKey] || [])
    .map((ut) => ({ ...ut, isUserCreated: true }))
  const templates = [...builtinTemplates, ...userTemplates]

  const getCustomHtml = (templateId) => {
    return customTemplates?.[categoryKey]?.[templateId] || null
  }

  const openEditor = (tmpl) => {
    const customHtml = getCustomHtml(tmpl.id)
    if (customHtml) {
      setEditHtml(customHtml)
    } else {
      // 기본 템플릿에서 더미 데이터로 생성
      const dummyCase = {
        clientName: '[의뢰인]',
        opponent: '[상대방]',
        opposingParty: '[상대방]',
        court: '[법원]',
        caseNumber: '[사건번호]',
        type: activeTab === 'criminal' ? '형사' : activeTab === 'consult' ? '자문' : '민사',
        subject: '[자문 주제]',
        criminalInfo: { charges: '[죄명]', policeCaseNumber: '[사건번호]' },
      }
      setEditHtml(getDefaultTemplate(tmpl.id, dummyCase, profile))
    }
    setEditingTemplate(tmpl)
    setShowPreview(false)
  }

  const handleSave = async () => {
    if (!editingTemplate) return
    setIsSaving(true)
    try {
      const updated = { ...(customTemplates || {}) }
      if (!updated[categoryKey]) updated[categoryKey] = {}
      updated[categoryKey][editingTemplate.id] = editHtml
      await saveTemplates(updated)
      showToast(`${editingTemplate.label} 템플릿이 저장되었습니다.`, 'success')
      setEditingTemplate(null)
    } catch (err) {
      showToast(`저장 실패: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async (tmpl) => {
    setIsSaving(true)
    try {
      const updated = { ...(customTemplates || {}) }
      if (updated[categoryKey]) {
        delete updated[categoryKey][tmpl.id]
        await saveTemplates(updated)
        showToast(`${tmpl.label} 템플릿이 기본값으로 초기화되었습니다.`, 'success')
      }
    } catch (err) {
      showToast(`초기화 실패: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // 새 템플릿 만들기
  const handleCreateNew = async () => {
    if (!newName.trim()) return

    // 팝업 차단 방지: 클릭 시점에 새 창을 먼저 열기
    const newWindow = window.open('about:blank', '_blank')

    setIsCreatingNew(true)
    try {
      const templateId = `custom_${Date.now()}`
      const lawyerName = profile?.lawyerName || '[변호사명]'
      const officeName = profile?.officeName || '[사무소명]'
      const phone = profile?.phone || '[연락처]'

      // 기본 틀 HTML 생성
      const baseHtml = `
<style>
  body { font-family: 'Batang', serif; font-size: 12pt; line-height: 1.8; }
  h1 { text-align: center; font-size: 18pt; margin-bottom: 24pt; }
  h2 { font-size: 14pt; margin-top: 18pt; }
  .center { text-align: center; }
  .right { text-align: right; }
  .indent { margin-left: 24pt; }
  .field { color: #1a73e8; }
  table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
  td, th { border: 1px solid #999; padding: 6pt 10pt; }
  th { background: #f5f5f5; font-weight: bold; }
</style>
<h1>${newName.trim()}</h1>
<table>
  <tr><th width="15%">작성자</th><td>${officeName} 변호사 ${lawyerName}</td></tr>
  <tr><th>연락처</th><td>${phone}</td></tr>
  <tr><th>일자</th><td>[날짜]</td></tr>
  <tr><th>의뢰인</th><td>[의뢰인]</td></tr>
</table>
<h2>1. 제목</h2>
<p class="indent field">[내용을 입력하세요]</p>
<h2>2. 제목</h2>
<p class="indent field">[내용을 입력하세요]</p>
<h2>3. 제목</h2>
<p class="indent field">[내용을 입력하세요]</p>
<br/>
<p class="right">[날짜]</p>
<p class="right">${officeName}</p>
<p class="right">변호사 ${lawyerName}</p>`

      // Google Docs 생성
      const doc = await createGoogleDoc(dataFolderId, `[템플릿] ${newName.trim()}`, baseHtml)

      // 메타 저장
      const updated = { ...(customTemplates || {}) }
      if (!updated._userTemplates) updated._userTemplates = {}
      if (!updated._userTemplates[categoryKey]) updated._userTemplates[categoryKey] = []
      updated._userTemplates[categoryKey].push({
        id: templateId,
        label: newName.trim(),
        icon: '📝',
      })
      // 기본 HTML 저장
      if (!updated[categoryKey]) updated[categoryKey] = {}
      updated[categoryKey][templateId] = baseHtml
      await saveTemplates(updated)

      // Docs 맵에 등록
      setDocsMap({ ...docsMap, [templateId]: { docId: doc.id, webViewLink: doc.webViewLink } })

      if (newWindow) newWindow.location.href = doc.webViewLink
      showToast(`"${newName.trim()}" 템플릿이 생성되었습니다. Google Docs에서 편집하세요.`, 'success')
      setNewName('')
      setShowNewForm(false)
    } catch (err) {
      if (newWindow) newWindow.close()
      showToast(`생성 실패: ${err.message}`, 'error')
    } finally {
      setIsCreatingNew(false)
    }
  }

  // 사용자 템플릿 삭제
  const handleDeleteUserTemplate = async (tmpl) => {
    setIsSaving(true)
    try {
      const updated = { ...(customTemplates || {}) }
      if (updated._userTemplates?.[categoryKey]) {
        updated._userTemplates[categoryKey] = updated._userTemplates[categoryKey].filter((t) => t.id !== tmpl.id)
      }
      if (updated[categoryKey]) {
        delete updated[categoryKey][tmpl.id]
      }
      await saveTemplates(updated)
      showToast(`${tmpl.label} 템플릿이 삭제되었습니다.`, 'success')
    } catch (err) {
      showToast(`삭제 실패: ${err.message}`, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // 문서 파일 업로드 → Docs 변환 → 템플릿 등록
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (!templatesFolderId) {
      showToast('템플릿 폴더가 아직 준비되지 않았습니다.', 'error')
      return
    }

    setIsUploadingDoc(true)
    try {
      // Drive templates/ 폴더에 Google Docs로 업로드
      const doc = await uploadFileAsGoogleDoc(templatesFolderId, file)
      const templateId = `docs_${Date.now()}`
      const label = file.name.replace(/\.[^.]+$/, '')

      // Export해서 HTML로 저장
      const html = await exportGoogleDocAsHtml(doc.id)

      // 메타 + HTML 저장
      const updated = { ...(customTemplates || {}) }
      if (!updated._userTemplates) updated._userTemplates = {}
      if (!updated._userTemplates[categoryKey]) updated._userTemplates[categoryKey] = []
      updated._userTemplates[categoryKey].push({
        id: templateId,
        label,
        icon: '📎',
        docsId: doc.id,
        webViewLink: doc.webViewLink,
      })
      if (!updated[categoryKey]) updated[categoryKey] = {}
      updated[categoryKey][templateId] = html
      await saveTemplates(updated)

      setDocsMap({ ...docsMap, [templateId]: { docId: doc.id, webViewLink: doc.webViewLink } })
      showToast(`"${label}" 파일이 템플릿으로 등록되었습니다.`, 'success')
    } catch (err) {
      showToast(`업로드 실패: ${err.message}`, 'error')
    } finally {
      setIsUploadingDoc(false)
    }
  }

  // Google Docs로 편집: 현재 템플릿 HTML을 Google Doc으로 생성
  const handleOpenInDocs = async (tmpl) => {
    // 이미 만든 Doc이 있으면 바로 열기
    if (docsMap[tmpl.id]) {
      window.open(docsMap[tmpl.id].webViewLink, '_blank')
      return
    }

    // 팝업 차단 방지: 클릭 시점에 새 창을 먼저 열고, API 완료 후 URL 설정
    const newWindow = window.open('about:blank', '_blank')

    setIsCreatingDoc(tmpl.id)
    try {
      const customHtml = getCustomHtml(tmpl.id)
      let html
      if (customHtml) {
        html = customHtml
      } else {
        const dummyCase = {
          clientName: '[의뢰인]', opponent: '[상대방]', opposingParty: '[상대방]',
          court: '[법원]', caseNumber: '[사건번호]',
          type: activeTab === 'criminal' ? '형사' : activeTab === 'consult' ? '자문' : '민사',
          subject: '[자문 주제]',
          criminalInfo: { charges: '[죄명]', policeCaseNumber: '[사건번호]' },
        }
        html = getDefaultTemplate(tmpl.id, dummyCase, profile)
      }

      const doc = await createGoogleDoc(dataFolderId, `[템플릿] ${tmpl.label}`, html)
      setDocsMap({ ...docsMap, [tmpl.id]: { docId: doc.id, webViewLink: doc.webViewLink } })
      if (newWindow) newWindow.location.href = doc.webViewLink
      showToast('Google Docs에서 편집하세요. 완료 후 "가져오기"를 눌러주세요.', 'success')
    } catch (err) {
      if (newWindow) newWindow.close()
      showToast(`Google Docs 생성 실패: ${err.message}`, 'error')
    } finally {
      setIsCreatingDoc(null)
    }
  }

  // Google Docs에서 가져오기: Doc을 HTML로 export → 커스텀 템플릿으로 저장
  const handleImportFromDocs = async (tmpl) => {
    const docInfo = docsMap[tmpl.id]
    if (!docInfo) {
      showToast('먼저 "Docs로 편집"을 눌러 Google Docs를 생성하세요.', 'error')
      return
    }

    setIsImporting(tmpl.id)
    try {
      const html = await exportGoogleDocAsHtml(docInfo.docId)

      const updated = { ...(customTemplates || {}) }
      if (!updated[categoryKey]) updated[categoryKey] = {}
      updated[categoryKey][tmpl.id] = html
      await saveTemplates(updated)

      // 임시 Doc 삭제
      try { await deleteFile(docInfo.docId) } catch { /* 무시 */ }
      const newMap = { ...docsMap }
      delete newMap[tmpl.id]
      setDocsMap(newMap)

      showToast(`${tmpl.label} 템플릿이 Google Docs에서 가져와 저장되었습니다.`, 'success')
    } catch (err) {
      showToast(`가져오기 실패: ${err.message}`, 'error')
    } finally {
      setIsImporting(null)
    }
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group gap="xs">
          <ThemeIcon size={28} variant="light" color="grape" radius="xl">
            <IconFileText size={16} />
          </ThemeIcon>
          <Text size="lg" fw={700}>서면 템플릿</Text>
        </Group>

        <Alert variant="light" color="blue" radius="md">
          <Text size="sm">
            서면 작성 시 사용되는 템플릿을 편집할 수 있습니다.
            편집 후 저장하면 이후 서면 작성 시 수정된 양식이 적용됩니다.
            <br />
            <Text span fw={500}>플레이스홀더</Text>: [의뢰인], [상대방], [법원], [사건번호], [변호사명], [사무소명], [연락처], [날짜] — 서면 작성 시 자동 치환됩니다.
          </Text>
        </Alert>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="civil" leftSection={<IconScale size={14} />}>
              민사 ({CIVIL_TEMPLATES.length})
            </Tabs.Tab>
            <Tabs.Tab value="criminal" leftSection={<IconGavel size={14} />}>
              형사 ({CRIMINAL_TEMPLATES.length})
            </Tabs.Tab>
            <Tabs.Tab value="consult" leftSection={<IconFileText size={14} />}>
              자문 ({CONSULT_TEMPLATES.length})
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* 새 템플릿 만들기 */}
        {showNewForm ? (
          <Card padding="md" withBorder bg="blue.0">
            <Group gap="sm">
              <TextInput
                placeholder="새 서면 이름 (예: 이행최고서, 경고장)"
                value={newName}
                onChange={(e) => setNewName(e.currentTarget.value)}
                style={{ flex: 1 }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNew() }}
              />
              <Button
                loading={isCreatingNew}
                disabled={!newName.trim()}
                onClick={handleCreateNew}
              >
                만들기
              </Button>
              <Button variant="default" onClick={() => { setShowNewForm(false); setNewName('') }}>
                취소
              </Button>
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              기본 틀이 포함된 Google Docs가 생성됩니다. Docs에서 편집 후 "가져오기"를 눌러주세요.
            </Text>
          </Card>
        ) : (
          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<Text size="lg">+</Text>}
              onClick={() => setShowNewForm(true)}
            >
              새 서면 템플릿 만들기
            </Button>
            <Button
              variant="light"
              color="teal"
              leftSection={<IconUpload size={16} />}
              loading={isUploadingDoc}
              onClick={() => uploadRef.current?.click()}
            >
              문서로 추가
            </Button>
            <input
              ref={uploadRef}
              type="file"
              accept=".doc,.docx,.pdf,.txt,.rtf,.odt,.hwp"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </Group>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {templates.map((tmpl) => {
            const hasCustom = !!getCustomHtml(tmpl.id)
            return (
              <Card key={tmpl.id} padding="md" withBorder>
                <Group justify="space-between">
                  <Group gap="xs">
                    <Text size="lg">{tmpl.icon}</Text>
                    <div>
                      <Text size="sm" fw={600}>{tmpl.label}</Text>
                      {tmpl.isUserCreated
                        ? <Text size="xs" c="blue" fw={500}>직접 만든 서면</Text>
                        : hasCustom && <Text size="xs" c="teal" fw={500}>수정됨</Text>
                      }
                    </div>
                  </Group>
                  <Group gap={4}>
                    {tmpl.isUserCreated && (
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        color="red"
                        onClick={() => handleDeleteUserTemplate(tmpl)}
                      >
                        삭제
                      </Button>
                    )}
                    {hasCustom && (
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        color="gray"
                        leftSection={<IconRefresh size={12} />}
                        onClick={() => handleReset(tmpl)}
                      >
                        초기화
                      </Button>
                    )}
                    <Button
                      size="compact-xs"
                      variant="light"
                      leftSection={<IconEdit size={12} />}
                      onClick={() => openEditor(tmpl)}
                    >
                      HTML
                    </Button>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="blue"
                      leftSection={<IconBrandGoogleDrive size={12} />}
                      loading={isCreatingDoc === tmpl.id}
                      onClick={() => handleOpenInDocs(tmpl)}
                    >
                      {docsMap[tmpl.id] ? 'Docs 열기' : 'Docs로 편집'}
                    </Button>
                    {docsMap[tmpl.id] && (
                      <Button
                        size="compact-xs"
                        variant="filled"
                        color="teal"
                        leftSection={<IconDownload size={12} />}
                        loading={isImporting === tmpl.id}
                        onClick={() => handleImportFromDocs(tmpl)}
                      >
                        가져오기
                      </Button>
                    )}
                  </Group>
                </Group>
              </Card>
            )
          })}
        </SimpleGrid>
      </Stack>

      {/* 편집 모달 */}
      <Modal
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title={`${editingTemplate?.icon || ''} ${editingTemplate?.label || ''} 편집`}
      >
        <Stack gap="sm">
          <Group justify="flex-end" gap={4}>
            <Button
              size="compact-xs"
              variant={showPreview ? 'light' : 'filled'}
              color="gray"
              leftSection={<IconCode size={12} />}
              onClick={() => setShowPreview(false)}
            >
              HTML
            </Button>
            <Button
              size="compact-xs"
              variant={showPreview ? 'filled' : 'light'}
              color="blue"
              leftSection={<IconEye size={12} />}
              onClick={() => setShowPreview(true)}
            >
              미리보기
            </Button>
          </Group>

          {showPreview ? (
            <Box
              style={{
                border: '1px solid var(--mantine-color-gray-3)',
                borderRadius: 8,
                padding: 16,
                minHeight: 400,
                maxHeight: 500,
                overflow: 'auto',
                background: 'white',
              }}
              dangerouslySetInnerHTML={{ __html: editHtml }}
            />
          ) : (
            <Textarea
              value={editHtml}
              onChange={(e) => setEditHtml(e.currentTarget.value)}
              minRows={16}
              maxRows={24}
              autosize
              styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
            />
          )}

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setEditingTemplate(null)}>
              취소
            </Button>
            <Button
              leftSection={<IconCheck size={14} />}
              loading={isSaving}
              onClick={handleSave}
            >
              저장
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  )
}
