export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  danger?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

export interface ConfirmRequest extends ConfirmOptions {
  id: string;
  resolve: (accepted: boolean) => void;
}

type ToastListener = (toast: ToastMessage) => void;
type ConfirmListener = (req: ConfirmRequest) => void;

const toastListeners = new Set<ToastListener>();
const confirmListeners = new Set<ConfirmListener>();

export function subscribeToasts(listener: ToastListener): () => void {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

export function subscribeConfirms(listener: ConfirmListener): () => void {
  confirmListeners.add(listener);
  return () => {
    confirmListeners.delete(listener);
  };
}

export function showToast(message: string, variant: ToastVariant = 'info'): void {
  const cleanMsg = message.trim();
  if (!cleanMsg) return;

  if (toastListeners.size === 0) {
    console.info(`[Toast:${variant}]`, cleanMsg);
    return;
  }

  const toast: ToastMessage = {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message: cleanMsg,
    variant
  };
  toastListeners.forEach(listener => listener(toast));
}

export function askConfirm(options: ConfirmOptions | string): Promise<boolean> {
  const normalized: ConfirmOptions = typeof options === 'string' ? { message: options } : options;

  if (confirmListeners.size === 0) {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    const isDanger = normalized.danger ?? normalized.variant === 'danger';
    const req: ConfirmRequest = {
      id: `confirm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: normalized.title || (isDanger ? 'Konfirmasi Penghapusan' : 'Konfirmasi Tindakan'),
      message: normalized.message,
      confirmLabel: normalized.confirmLabel || normalized.confirmText || (isDanger ? 'Ya, Hapus' : 'Ya, Lanjutkan'),
      cancelLabel: normalized.cancelLabel || 'Batal',
      danger: isDanger,
      variant: normalized.variant,
      resolve
    };
    confirmListeners.forEach(listener => listener(req));
  });
}
