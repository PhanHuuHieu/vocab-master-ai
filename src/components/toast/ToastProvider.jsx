import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Flame,
    Gamepad2,
    Info,
    Sparkles,
    Star,
    Trophy,
    X,
    Zap,
} from 'lucide-react';

const ToastContext = createContext(null);

const TYPE_CONFIG = {
    success: {
        icon: CheckCircle2,
        title: 'Success',
        duration: 3000,
        className: 'toast-theme-success',
        barClassName: 'toast-theme-success-bar',
    },
    error: {
        icon: AlertCircle,
        title: 'Error',
        duration: 6000,
        className: 'toast-theme-danger',
        barClassName: 'toast-theme-danger-bar',
    },
    warning: {
        icon: AlertTriangle,
        title: 'Warning',
        duration: 4500,
        className: 'toast-theme-reward',
        barClassName: 'toast-theme-reward-bar',
    },
    info: {
        icon: Info,
        title: 'Info',
        duration: 3200,
        className: 'toast-theme-accent',
        barClassName: 'toast-theme-accent-bar',
    },
    game: {
        icon: Gamepad2,
        title: 'Game',
        duration: 2600,
        className: 'toast-theme-primary',
        barClassName: 'toast-theme-primary-bar',
    },
    xp: {
        icon: Zap,
        title: 'XP',
        duration: 2600,
        className: 'toast-theme-accent',
        barClassName: 'toast-theme-accent-bar',
    },
    levelUp: {
        icon: Trophy,
        title: 'Level Up',
        duration: 4200,
        className: 'toast-theme-reward',
        barClassName: 'toast-theme-reward-bar',
        large: true,
    },
    streak: {
        icon: Flame,
        title: 'Streak',
        duration: 3800,
        className: 'toast-theme-reward',
        barClassName: 'toast-theme-reward-bar',
    },
    achievement: {
        icon: Star,
        title: 'Achievement',
        duration: 4600,
        className: 'toast-theme-reward',
        barClassName: 'toast-theme-reward-bar',
        large: true,
    },
};

function normalizeToastInput(input, type) {
    if (typeof input === 'string') {
        return { description: input, type };
    }
    return { ...(input || {}), type: input?.type || type };
}

function ToastItem({ toast, onClose }) {
    const { icon: Icon, className, barClassName, large } = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
    const [remaining, setRemaining] = useState(toast.duration);
    const [paused, setPaused] = useState(false);
    const timerRef = useRef(null);
    const startRef = useRef(Date.now());

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const startTimer = useCallback((delay) => {
        clearTimer();
        startRef.current = Date.now();
        timerRef.current = setTimeout(() => onClose(toast.id), delay);
    }, [clearTimer, onClose, toast.id]);

    React.useEffect(() => {
        if (toast.persist) return undefined;
        startTimer(remaining);
        return () => clearTimer();
    }, [toast.persist, remaining, startTimer, clearTimer]);

    const handlePause = () => {
        if (toast.persist || paused) return;
        setPaused(true);
        clearTimer();
        const elapsed = Date.now() - startRef.current;
        setRemaining((prev) => Math.max(0, prev - elapsed));
    };

    const handleResume = () => {
        if (toast.persist || !paused) return;
        setPaused(false);
        startTimer(remaining);
    };

    return (
        <div
            role="status"
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            onMouseEnter={handlePause}
            onMouseLeave={handleResume}
            className={`w-full rounded-2xl border shadow-lg backdrop-blur-sm overflow-hidden transition-all ${className} ${large ? 'max-w-md' : 'max-w-sm'}`}
        >
            <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${toast.type === 'levelUp' || toast.type === 'streak' ? 'animate-pulse' : ''}`}>
                        <Icon className={`w-${large ? '6' : '5'} h-${large ? '6' : '5'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`font-black ${large ? 'text-base' : 'text-sm'}`}>{toast.title}</p>
                        {toast.description && <p className={`mt-0.5 ${large ? 'text-sm' : 'text-xs'} opacity-90`}>{toast.description}</p>}
                        {toast.action?.label && (
                            <button
                                onClick={() => {
                                    toast.action.onClick?.();
                                    onClose(toast.id);
                                }}
                                className="mt-2 text-xs font-bold underline underline-offset-2 hover:opacity-80"
                            >
                                {toast.action.label}
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => onClose(toast.id)}
                        className="p-1 rounded-lg hover:bg-black/10 transition-colors"
                        aria-label="Close toast"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            {!toast.persist && (
                <div className="h-1 bg-black/10">
                    <div
                        className={`h-full ${barClassName} transition-all duration-100`}
                        style={{ width: `${Math.max(0, Math.min(100, (remaining / toast.duration) * 100))}%` }}
                    />
                </div>
            )}
        </div>
    );
}

function ToastContainer({ toasts, dismiss }) {
    return (
        <div className="fixed z-[120] pointer-events-none top-4 right-4 w-[min(92vw,420px)] flex flex-col gap-3 md:top-5 md:right-5 max-sm:top-auto max-sm:bottom-4 max-sm:left-1/2 max-sm:-translate-x-1/2">
            {toasts.map((toast) => (
                <div key={toast.id} className="pointer-events-auto animate-in slide-in-from-top-3 fade-in duration-300">
                    <ToastItem toast={toast} onClose={dismiss} />
                </div>
            ))}
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const dedupeRef = useRef(new Map());

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const show = useCallback((input) => {
        const opts = normalizeToastInput(input, input?.type || 'info');
        const cfg = TYPE_CONFIG[opts.type] || TYPE_CONFIG.info;

        const dedupeKey = opts.dedupeKey || `${opts.type}|${opts.title || opts.description || ''}`;
        const now = Date.now();
        const last = dedupeRef.current.get(dedupeKey) || 0;
        const dedupeWindowMs = Number(opts.dedupeWindowMs || 1400);

        if (now - last < dedupeWindowMs) {
            return null;
        }
        dedupeRef.current.set(dedupeKey, now);

        const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
        const toast = {
            id,
            type: opts.type || 'info',
            title: opts.title || cfg.title,
            description: opts.description || '',
            duration: Number(opts.duration || cfg.duration),
            persist: Boolean(opts.persist),
            action: opts.action || null,
        };

        setToasts((prev) => {
            const next = [...prev, toast];
            const maxVisible = 5;
            if (next.length <= maxVisible) return next;
            return next.slice(next.length - maxVisible);
        });

        return id;
    }, []);

    const api = useMemo(() => {
        const makeType = (type) => (input, extra = {}) => {
            if (typeof input === 'string') return show({ type, description: input, ...extra });
            return show({ ...(input || {}), type, ...extra });
        };

        return {
            show,
            dismiss,
            success: makeType('success'),
            error: makeType('error'),
            warning: makeType('warning'),
            info: makeType('info'),
            game: makeType('game'),
            xp: makeType('xp'),
            levelUp: makeType('levelUp'),
            streak: makeType('streak'),
            achievement: makeType('achievement'),
            wordAdded: (word) => show({ type: 'success', description: `Word added successfully: ${word}` }),
            wordDeleted: (word) => show({ type: 'warning', description: `Word deleted successfully: ${word}` }),
            lessonCreated: (lesson) => show({ type: 'success', description: `Lesson created: ${lesson}` }),
            topicDeleted: (topic) => show({ type: 'warning', description: `Topic deleted: ${topic}` }),
            importSuccess: ({ words = 0, skipped = 0 }) => show({
                type: skipped > 0 ? 'warning' : 'success',
                title: skipped > 0 ? 'Import completed with warnings' : 'Import completed',
                description: `Imported ${words} words${skipped > 0 ? `, skipped ${skipped} rows` : ''}.`,
            }),
            reviewAdded: (word) => show({ type: 'info', description: `Added to review queue: ${word}` }),
            correctAnswer: ({ xp = 10, streak = 1 } = {}) => show({ type: 'game', description: `Correct! +${xp} XP${streak > 1 ? ` | Streak x${streak}` : ''}` }),
            levelUpEvent: ({ level }) => show({ type: 'levelUp', title: 'Level Up!', description: `You reached Level ${level}`, duration: 4800 }),
            streakMilestone: ({ days }) => show({ type: 'streak', title: `${days}-Day Streak!`, description: "You're on fire", duration: 4200 }),
            achievementUnlocked: ({ title }) => show({ type: 'achievement', title: 'Achievement unlocked', description: title, duration: 5200 }),
        };
    }, [show, dismiss]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <ToastContainer toasts={toasts} dismiss={dismiss} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}
