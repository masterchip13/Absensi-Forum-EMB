import React, { useEffect, useState } from 'react';
import {
  ConfirmRequest,
  ToastMessage,
  subscribeConfirms,
  subscribeToasts
} from '../utils/uiDialogs';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export const AppDialogHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmQueue, setConfirmQueue] = useState<ConfirmRequest[]>([]);

  useEffect(() => {
    const unsubToast = subscribeToasts((toast) => {
      setToasts((prev) => [...prev.slice(-3), toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, 4200);
    });

    const unsubConfirm = subscribeConfirms((req) => {
      setConfirmQueue((prev) => [...prev, req]);
    });

    return () => {
      unsubToast();
      unsubConfirm();
    };
  }, []);

  const activeConfirm = confirmQueue[0] || null;

  const handleResolveConfirm = (accepted: boolean) => {
    if (!activeConfirm) return;
    activeConfirm.resolve(accepted);
    setConfirmQueue((prev) => prev.slice(1));
  };

  useEffect(() => {
    if (!activeConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleResolveConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <>
      {/* Non-blocking Toast Stack */}
      {toasts.length > 0 && (
        <div
          className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none no-print"
          aria-live="polite"
        >
          {toasts.map((t) => {
            const styleMap = {
              success: 'bg-emerald-950/95 border-emerald-500/60 text-emerald-50',
              error: 'bg-rose-950/95 border-rose-500/60 text-rose-50',
              warning: 'bg-amber-950/95 border-amber-500/60 text-amber-50',
              info: 'bg-slate-900/95 border-blue-500/50 text-slate-50'
            };
            const iconMap = {
              success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
              error: <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />,
              warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
              info: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            };

            return (
              <div
                key={t.id}
                className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-3 rounded-2xl border shadow-xl backdrop-blur-md text-xs font-medium animate-fade-in ${styleMap[t.variant]}`}
              >
                {iconMap[t.variant]}
                <p className="flex-1 leading-relaxed whitespace-pre-line">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  className="text-white/60 hover:text-white p-0.5 rounded-lg transition cursor-pointer shrink-0"
                  aria-label="Tutup notifikasi"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Non-blocking Confirm Modal (Replaces window.confirm) */}
      {activeConfirm && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in no-print"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-5 flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  activeConfirm.danger
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {activeConfirm.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
                  {activeConfirm.message}
                </p>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleResolveConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer"
              >
                {activeConfirm.cancelLabel || 'Batal'}
              </button>
              <button
                type="button"
                onClick={() => handleResolveConfirm(true)}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition cursor-pointer ${
                  activeConfirm.danger
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {activeConfirm.confirmLabel || 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
