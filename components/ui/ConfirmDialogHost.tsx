'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { AlertTriangle, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Red confirm button + warning icon, for destructive actions (delete/cancel/revoke). Default true. */
  danger?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

// Module-level subject so `confirmDialog()` can be called from anywhere (event
// handlers, not just components) without prop-drilling — same pattern as react-hot-toast's
// own imperative `toast()` API. One <ConfirmDialogHost /> mounted in AuthProvider renders
// whatever's currently pending.
let notify: ((pending: PendingConfirm | null) => void) | null = null;

/**
 * Promise-based replacement for `window.confirm()` — resolves `true`/`false` instead of
 * blocking the thread, and renders as a themed Modal (ERPNext-style) instead of the
 * browser's native dialog. Usage: `if (!(await confirmDialog({ message: 'Hapus item ini?' }))) return;`
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!notify) {
      // Host not mounted yet (shouldn't happen in practice) — fail safe to "cancelled".
      resolve(false);
      return;
    }
    notify({ ...options, resolve });
  });
}

export default function ConfirmDialogHost() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    notify = setPending;
    return () => {
      notify = null;
    };
  }, []);

  const close = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  const danger = pending?.danger ?? true;

  return (
    <Modal isOpen={!!pending} onClose={() => close(false)} title={pending?.title || (danger ? 'Konfirmasi Hapus' : 'Konfirmasi')} size="sm">
      {pending && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className={`p-1.5 rounded-md mt-0.5 ${danger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
              {danger ? (
                <AlertTriangle className="text-red-500" size={18} />
              ) : (
                <HelpCircle className="text-blue-500" size={18} />
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-200 pt-0.5">{pending.message}</p>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" onClick={() => close(false)}>
              {pending.cancelText || 'Batal'}
            </Button>
            <Button variant={danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
              {pending.confirmText || (danger ? 'Ya, Hapus' : 'Ya')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
