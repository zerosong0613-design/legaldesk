import { Notification } from '@mantine/core'
import { IconCheck, IconInfoCircle, IconX } from '@tabler/icons-react'
import { useUiStore } from '../../store/uiStore'

const CONFIG = {
  info: { color: 'indigo', icon: <IconInfoCircle size={18} /> },
  success: { color: 'teal', icon: <IconCheck size={18} /> },
  error: { color: 'red', icon: <IconX size={18} /> },
}

export default function Toast() {
  const { toast } = useUiStore()

  if (!toast) return null

  const config = CONFIG[toast.type] || CONFIG.info

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
      <Notification
        color={config.color}
        icon={config.icon}
        withCloseButton={false}
        withBorder
        radius="md"
      >
        {toast.message}
      </Notification>
    </div>
  )
}
