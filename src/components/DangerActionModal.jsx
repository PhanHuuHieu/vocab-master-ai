import React, { useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

const WARNING_STYLES = {
    normal: {
        badge: 'theme-reward-soft-bg theme-reward-text theme-reward-soft-border',
        panel: 'theme-reward-soft-bg theme-reward-soft-border theme-reward-strong-text',
        confirm: 'theme-danger-solid-bg theme-danger-solid-hover focus:ring-[color:var(--color-danger-soft)]',
    },
    danger: {
        badge: 'theme-danger-soft-bg theme-danger-text theme-danger-soft-border',
        panel: 'theme-danger-soft-bg theme-danger-soft-border theme-danger-strong-text',
        confirm: 'theme-danger-solid-bg theme-danger-solid-hover focus:ring-[color:var(--color-danger-soft)]',
    },
    critical: {
        badge: 'bg-red-100 text-red-800 border-red-300',
        panel: 'bg-red-100/80 border-red-300 text-red-900',
        confirm: 'bg-red-700 hover:bg-red-800 focus:ring-red-400',
    },
};

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    'input:not([disabled])',
    'textarea:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function DangerActionModal({
    open,
    onClose,
    onConfirm,
    title,
    message,
    itemName,
    itemType,
    warningLevel = 'normal',
    confirmText = 'Delete',
    cancelText = 'Cancel',
    loading = false,
    error,
    showTypeToConfirm = false,
    typeToConfirmText = 'DELETE',
    confirmInput,
    onConfirmInputChange,
    consequenceList = [],
    icon,
    disableClose = false,
}) {
    const modalRef = useRef(null);
    const cancelButtonRef = useRef(null);
    const confirmInputRef = useRef(null);

    const level = WARNING_STYLES[warningLevel] ? warningLevel : 'normal';
    const styles = WARNING_STYLES[level];
    const requireLockedClose = disableClose || level === 'critical';

    const isTypeConfirmed = useMemo(() => {
        if (!showTypeToConfirm) return true;
        return String(confirmInput || '').trim() === String(typeToConfirmText || '').trim();
    }, [showTypeToConfirm, confirmInput, typeToConfirmText]);

    const canSubmit = !loading && isTypeConfirmed;

    useEffect(() => {
        if (!open) return;

        const focusTimer = setTimeout(() => {
            if (showTypeToConfirm && confirmInputRef.current) {
                confirmInputRef.current.focus();
            } else if (cancelButtonRef.current) {
                cancelButtonRef.current.focus();
            }
        }, 40);

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !requireLockedClose && !loading) {
                onClose();
                return;
            }

            if (event.key !== 'Tab') return;
            const container = modalRef.current;
            if (!container) return;

            const focusables = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
            if (!focusables.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;

            if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open, showTypeToConfirm, onClose, requireLockedClose, loading]);

    if (!open) return null;

    const renderIcon = icon || <AlertTriangle className={`w-5 h-5 ${level === 'critical' ? 'animate-pulse' : ''}`} />;

    return (
        <div
            className="fixed inset-0 z-[80] bg-slate-900/55 backdrop-blur-[3px] flex items-center justify-center p-4 animate-in fade-in duration-200"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (requireLockedClose || loading) return;
                onClose();
            }}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="danger-modal-title"
                aria-describedby="danger-modal-message"
                className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            >
                <div className="px-6 pt-6 pb-5 border-b border-slate-100 dark:border-slate-800">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${styles.badge}`}>
                        {renderIcon}
                        {level === 'critical' ? 'Critical Action' : 'Danger Action'}
                    </div>

                    <h3 id="danger-modal-title" className="mt-3 text-2xl font-black text-slate-900 dark:text-slate-100">
                        {title}
                    </h3>

                    <p id="danger-modal-message" className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {message}
                    </p>

                    {(itemName || itemType) && (
                        <div className="mt-3 text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                            <span className="font-semibold">{itemType || 'Item'}:</span>{' '}
                            <span className="font-black">{itemName || 'Unknown'}</span>
                        </div>
                    )}
                </div>

                <div className="px-6 py-5 space-y-4">
                    {consequenceList.length > 0 && (
                        <div className={`rounded-2xl border px-4 py-3 ${styles.panel}`}>
                            <p className="text-xs font-black uppercase tracking-wider mb-2">Consequence</p>
                            <ul className="space-y-1 text-sm list-disc pl-5">
                                {consequenceList.map((line, index) => (
                                    <li key={`${line}-${index}`}>{line}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {showTypeToConfirm && (
                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                                Type to confirm
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                Type <span className="font-black text-rose-700 dark:text-rose-300">{typeToConfirmText}</span> to continue.
                            </p>
                            <input
                                ref={confirmInputRef}
                                value={confirmInput || ''}
                                onChange={(event) => onConfirmInputChange?.(event.target.value)}
                                placeholder={`Type ${typeToConfirmText}`}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-300"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-rose-700 dark:text-rose-200 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl px-3 py-2">
                            {error}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                        ref={cancelButtonRef}
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={onConfirm}
                        disabled={!canSubmit}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 ${styles.confirm}`}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {loading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
