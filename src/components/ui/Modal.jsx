import { Modal as MantineModal } from '@mantine/core'

export default function Modal({ isOpen, onClose, title, children }) {
  return (
    <MantineModal
      opened={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      centered
      overlayProps={{ backgroundOpacity: 0.4, blur: 2 }}
      styles={{
        title: { fontWeight: 600, fontSize: '1.125rem' },
      }}
    >
      {children}
    </MantineModal>
  )
}
