import { messages } from '../../constants/messages'
import Button from './Button'
import Modal from './Modal'

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = messages.actions.confirm,
  cancelLabel = messages.actions.cancel,
  tone = 'danger',
  loading = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {loading ? messages.common.saving : confirmLabel}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
        </>
      }
    />
  )
}
