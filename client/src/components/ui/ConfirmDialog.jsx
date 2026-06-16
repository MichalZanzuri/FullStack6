import Dialog from './Dialog.jsx';
import Button from './Button.jsx';
import styles from '../../styles/Dialog.module.css';

/**
 * Confirmation dialog used before destructive actions.
 *
 *  - title, body  → text shown to the reader
 *  - confirmLabel → label of the danger button
 *  - cancelLabel  → label of the safe button
 *  - onConfirm    → callback when the reader confirms (then auto-closes)
 *  - onClose      → callback to close without action
 */
export default function ConfirmDialog({
  title,
  body,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
          <Button variant="dangerFilled" onClick={() => { onConfirm(); onClose(); }}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className={styles.confirmText}>{body}</p>
    </Dialog>
  );
}
