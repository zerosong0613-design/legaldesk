import { useUiStore } from '../../store/uiStore'

const STYLES = {
  info: 'bg-blue-600',
  success: 'bg-green-600',
  error: 'bg-red-600',
}

export default function Toast() {
  const { toast } = useUiStore()

  if (!toast) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={`${STYLES[toast.type] || STYLES.info} text-white px-4 py-3 rounded-lg shadow-lg text-sm`}
      >
        {toast.message}
      </div>
    </div>
  )
}
