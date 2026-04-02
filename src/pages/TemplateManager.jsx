import { useState } from 'react'
import {
  Container, Stack, Group, Text, Tabs, Card, Button,
  Textarea, ActionIcon, Alert, SimpleGrid, Box,
  ThemeIcon,
} from '@mantine/core'
import {
  IconFileText, IconEdit, IconRefresh, IconCheck,
  IconScale, IconGavel, IconEye, IconCode,
} from '@tabler/icons-react'
import { useCaseStore } from '../store/caseStore'
import { useUiStore } from '../store/uiStore'
import Modal from '../components/ui/Modal'
import {
  CIVIL_TEMPLATES, CRIMINAL_TEMPLATES, CONSULT_TEMPLATES,
  getDefaultTemplate,
} from '../utils/legalTemplates'

export default function TemplateManager() {
  const { customTemplates, saveTemplates, profile } = useCaseStore()
  const { showToast } = useUiStore()

  const [activeTab, setActiveTab] = useState('civil')
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [editHtml, setEditHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const templates = activeTab === 'criminal' ? CRIMINAL_TEMPLATES
    : activeTab === 'consult' ? CONSULT_TEMPLATES
    : CIVIL_TEMPLATES
  const categoryKey = activeTab

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
                      {hasCustom && (
                        <Text size="xs" c="teal" fw={500}>수정됨</Text>
                      )}
                    </div>
                  </Group>
                  <Group gap={4}>
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
                      편집
                    </Button>
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
