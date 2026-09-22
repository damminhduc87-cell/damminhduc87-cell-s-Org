import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const styleConfig = {
    success: {
      border: 'border-emerald-200 bg-white',
      badge: 'bg-emerald-50 text-emerald-600',
      icon: 'fa-check-circle',
      title: 'text-emerald-900'
    },
    warning: {
      border: 'border-amber-200 bg-white',
      badge: 'bg-amber-50 text-amber-600',
      icon: 'fa-exclamation-triangle',
      title: 'text-amber-900'
    },
    error: {
      border: 'border-red-200 bg-white',
      badge: 'bg-red-50 text-red-600',
      icon: 'fa-exclamation-circle',
      title: 'text-red-900'
    },
    info: {
      border: 'border-blue-200 bg-white',
      badge: 'bg-blue-50 text-blue-600',
      icon: 'fa-info-circle',
      title: 'text-blue-900'
    }
  }[toast.type];

  return (
    <div className={`pointer-events-auto p-4 rounded-2xl shadow-lg border ${styleConfig.border} flex items-start gap-3 transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-2`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${styleConfig.badge}`}>
        <i className={`fas ${styleConfig.icon} text-sm`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <h5 className={`text-xs font-bold leading-none mb-1 ${styleConfig.title}`}>{toast.title}</h5>
        <p className="text-[11px] text-slate-600 leading-snug font-medium">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
      >
        <i className="fas fa-times text-xs"></i>
      </button>
    </div>
  );
};
