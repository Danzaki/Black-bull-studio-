export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

export const bus = { ready: false };

export function notify(message: string, type: 'error' | 'success' = 'error') {
  if (typeof window === 'undefined') return;
  if (!bus.ready) {
    window.alert(message);
    return;
  }
  window.dispatchEvent(new CustomEvent('bb-toast', { detail: { message, type } }));
}

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (!bus.ready) {
    return Promise.resolve(window.confirm(opts.title + (opts.message ? '\n\n' + opts.message : '')));
  }
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(new CustomEvent('bb-confirm', { detail: { ...opts, resolve } }));
  });
}
