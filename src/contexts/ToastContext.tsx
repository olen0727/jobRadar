import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface Toast {
    id: string;
    message: string;
    title?: string;
    type: ToastType;
    primaryButtonText?: string;
    onConfirm?: () => void;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    showConfirm: (title: string, message: string, buttonText?: string, onConfirm?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        if (type !== 'confirm') {
            setTimeout(() => {
                removeToast(id);
            }, 5000);
        }
    }, [removeToast]);

    const showConfirm = useCallback((title: string, message: string, buttonText: string = '確定', onConfirm?: () => void) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, title, message, type: 'confirm', primaryButtonText: buttonText, onConfirm }]);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, showConfirm }}>
            {children}

            {/* Dynamic Toast/Dialog Overlay */}
            <div className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-end p-4 md:items-end">
                {toasts.map((toast) => {
                    if (toast.type === 'confirm') {
                        return (
                            <div key={toast.id} className="pointer-events-auto fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                                <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                                    <div className="p-6">
                                        <div className="flex items-center gap-3 text-amber-600 mb-3">
                                            <AlertCircle className="w-6 h-6" />
                                            <h3 className="text-lg font-bold text-slate-900">{toast.title}</h3>
                                        </div>
                                        <p className="text-slate-600 text-sm leading-relaxed">{toast.message}</p>
                                    </div>
                                    <div className="bg-slate-50 px-6 py-4 flex flex-col gap-2">
                                        <button
                                            onClick={() => {
                                                toast.onConfirm?.();
                                                removeToast(toast.id);
                                            }}
                                            className="w-full bg-slate-900 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                                        >
                                            {toast.primaryButtonText}
                                        </button>
                                        <button
                                            onClick={() => removeToast(toast.id)}
                                            className="w-full text-slate-500 rounded-lg py-2 text-sm font-medium hover:bg-slate-200/50 transition-colors"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={toast.id}
                            className={cn(
                                "pointer-events-auto flex items-center gap-3 p-4 rounded-lg shadow-lg border mb-2 w-full max-w-sm animate-in slide-in-from-right-5 fade-in duration-300",
                                toast.type === 'success' && "bg-emerald-50 border-emerald-200 text-emerald-800",
                                toast.type === 'error' && "bg-rose-50 border-rose-200 text-rose-800",
                                toast.type === 'warning' && "bg-amber-50 border-amber-200 text-amber-800",
                                toast.type === 'info' && "bg-blue-50 border-blue-200 text-blue-800"
                            )}
                        >
                            {toast.type === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
                            {toast.type === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
                            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                            {toast.type === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}

                            <p className="text-sm font-medium flex-1">{toast.message}</p>

                            <button
                                onClick={() => removeToast(toast.id)}
                                className="p-1 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 opacity-50" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
