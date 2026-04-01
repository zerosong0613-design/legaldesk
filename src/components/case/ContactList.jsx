import { Group, Text, Button, Stack, TextInput, Select, Card, ActionIcon } from '@mantine/core'
import { IconPlus, IconTrash } from '@tabler/icons-react'

const ROLE_OPTIONS = [
  { value: '본인', label: '본인' },
  { value: '배우자', label: '배우자' },
  { value: '부', label: '부' },
  { value: '모', label: '모' },
  { value: '자녀', label: '자녀' },
  { value: '가족', label: '가족' },
  { value: '지인', label: '지인' },
  { value: '담당자', label: '담당자 (법인)' },
  { value: '대표', label: '대표 (법인)' },
  { value: '기타', label: '기타' },
]

export function migrateContacts(caseData) {
  if (caseData.contacts?.length > 0) return caseData.contacts

  const contacts = []
  // 기존 데이터 마이그레이션
  const name = caseData.clientName || ''
  const emails = caseData.clientEmails?.length > 0
    ? caseData.clientEmails
    : caseData.clientEmail ? [caseData.clientEmail] : []
  const phones = caseData.clientPhones?.length > 0
    ? caseData.clientPhones
    : caseData.clientPhone ? [caseData.clientPhone] : []

  contacts.push({
    role: '본인',
    name,
    phone: phones[0] || '',
    email: emails[0] || '',
  })

  // 법인 담당자
  if (caseData.contactPerson) {
    contacts.push({
      role: '담당자',
      name: caseData.contactPerson,
      phone: caseData.contactPersonPhone || '',
      email: '',
    })
  }

  // 형사 가족 연락처
  if (caseData.familyContacts?.length > 0) {
    for (const fc of caseData.familyContacts) {
      if (fc.name || fc.phone) {
        contacts.push({
          role: fc.relation || '가족',
          name: fc.name || '',
          phone: fc.phone || '',
          email: '',
        })
      }
    }
  }

  return contacts.length > 0 ? contacts : [{ role: '본인', name: '', phone: '', email: '' }]
}

export default function ContactList({ contacts, onChange }) {
  const handleChange = (index, field, value) => {
    const arr = [...contacts]
    arr[index] = { ...arr[index], [field]: value }
    onChange(arr)
  }

  const handleAdd = () => {
    onChange([...contacts, { role: '가족', name: '', phone: '', email: '' }])
  }

  const handleRemove = (index) => {
    const arr = contacts.filter((_, i) => i !== index)
    onChange(arr.length > 0 ? arr : [{ role: '본인', name: '', phone: '', email: '' }])
  }

  return (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text size="sm" fw={600}>연락처</Text>
        <Button variant="subtle" size="xs" leftSection={<IconPlus size={12} />} onClick={handleAdd}>추가</Button>
      </Group>

      {contacts.map((c, i) => (
        <Card key={i} padding="xs" withBorder>
          <Group gap={6} mb={6} wrap="nowrap">
            <Select
              size="xs"
              data={ROLE_OPTIONS}
              value={c.role}
              onChange={(val) => handleChange(i, 'role', val)}
              style={{ width: 120 }}
              allowDeselect={false}
            />
            <TextInput
              size="xs"
              placeholder="이름"
              value={c.name}
              onChange={(e) => handleChange(i, 'name', e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            {contacts.length > 1 && (
              <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleRemove(i)}>
                <IconTrash size={12} />
              </ActionIcon>
            )}
          </Group>
          <Group gap={6} wrap="nowrap">
            <TextInput
              size="xs"
              placeholder="010-0000-0000"
              value={c.phone}
              onChange={(e) => handleChange(i, 'phone', e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <TextInput
              size="xs"
              type="email"
              placeholder="email@example.com"
              value={c.email}
              onChange={(e) => handleChange(i, 'email', e.currentTarget.value)}
              style={{ flex: 1 }}
            />
          </Group>
        </Card>
      ))}
    </Stack>
  )
}
