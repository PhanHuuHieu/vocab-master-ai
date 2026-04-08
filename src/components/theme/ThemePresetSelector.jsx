import React from 'react';
import { CheckCircle2, Palette, Sparkles } from 'lucide-react';
import { useThemePreset } from '../../theme/ThemePresetProvider';
import { useToast } from '../toast/ToastProvider';

function ThemeSwatches({ colors }) {
    const swatches = [
        colors.primary,
        colors.accent,
        colors.success,
        colors.reward,
        colors.danger,
    ];

    return (
        <div className="flex items-center gap-1.5" aria-hidden="true">
            {swatches.map((color) => (
                <span
                    key={color}
                    className="h-5 w-5 rounded-full border border-white/80 shadow-[0_2px_6px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/70 dark:ring-slate-700/80"
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    );
}

function ThemeMiniPreview({ colors }) {
    const panelBackground = `linear-gradient(145deg, color-mix(in srgb, ${colors.primarySoft} 72%, #ffffff 28%) 0%, color-mix(in srgb, ${colors.accentSoft} 74%, #ffffff 26%) 100%)`;
    const glowBackground = `radial-gradient(circle at 72% 18%, color-mix(in srgb, ${colors.primary} 28%, transparent 72%) 0%, transparent 62%), radial-gradient(circle at 18% 76%, color-mix(in srgb, ${colors.accent} 22%, transparent 78%) 0%, transparent 58%)`;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/70 dark:border-slate-700/70 p-3.5 bg-white/80 dark:bg-slate-900/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="absolute inset-0 opacity-80" style={{ backgroundImage: glowBackground }} />
            <div className="relative rounded-xl border border-white/70 dark:border-slate-700/70 p-2.5" style={{ background: panelBackground }}>
                <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.primary }} />
                        <span className="h-1.5 w-12 rounded-full bg-slate-300/80 dark:bg-slate-500/60" />
                    </div>
                    <span
                        className="h-4 px-2 rounded-full text-[10px] font-bold text-white inline-flex items-center"
                        style={{ backgroundColor: colors.accent }}
                    >
                        Focus
                    </span>
                </div>

                <div className="flex items-center gap-2 mb-2.5">
                    <span
                        className="h-6 px-2.5 rounded-lg text-[10px] font-black text-white inline-flex items-center"
                        style={{ backgroundColor: colors.primary }}
                    >
                        Start
                    </span>
                    <span
                        className="h-6 px-2.5 rounded-lg text-[10px] font-bold inline-flex items-center"
                        style={{ backgroundColor: colors.accentSoft, color: colors.accent }}
                    >
                        Drill
                    </span>
                </div>

                <div className="h-1.5 rounded-full bg-white/70 dark:bg-slate-800/80 overflow-hidden mb-2.5">
                    <div
                        className="h-full rounded-full"
                        style={{
                            width: '72%',
                            backgroundImage: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                        }}
                    />
                </div>

                <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                    <div className="h-6 rounded-lg border border-white/70 dark:border-slate-700/70" style={{ backgroundColor: colors.successSoft }} />
                    <div className="h-6 rounded-lg border border-white/70 dark:border-slate-700/70" style={{ backgroundColor: colors.rewardSoft }} />
                </div>

                <div className="space-y-1.5">
                    <div className="h-1.5 rounded-full bg-slate-300/75 dark:bg-slate-500/55 w-[84%]" />
                    <div className="h-1.5 rounded-full bg-slate-300/65 dark:bg-slate-500/45 w-[62%]" />
                </div>
            </div>
        </div>
    );
}

function ThemePresetCard({ preset, active, onSelect }) {
    const { colors, name, description } = preset;
    const activeShadow = `0 16px 34px color-mix(in srgb, ${colors.primary} 24%, transparent 76%), 0 2px 0 rgba(255,255,255,0.6) inset`;

    return (
        <button
            onClick={onSelect}
            role="radio"
            aria-checked={active}
            aria-pressed={active}
            className={`group relative text-left rounded-3xl p-4 md:p-5 transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[color:var(--color-primary)] focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${active
                ? 'border-2 border-transparent'
                : 'border border-slate-200/80 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-xl'
                }`}
            style={active
                ? {
                    borderColor: colors.primary,
                    backgroundImage: `linear-gradient(160deg, color-mix(in srgb, ${colors.primarySoft} 34%, #ffffff 66%) 0%, color-mix(in srgb, ${colors.accentSoft} 26%, #ffffff 74%) 100%)`,
                    boxShadow: activeShadow,
                }
                : undefined}
        >
            <div className={`absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} style={{ background: `radial-gradient(circle at 78% 10%, color-mix(in srgb, ${colors.primary} 16%, transparent 84%) 0%, transparent 58%)` }} />

            <div className="relative">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                        <p className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">{name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>
                    </div>

                    {active ? (
                        <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-white shadow-md"
                            style={{ backgroundImage: `linear-gradient(120deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            Preview
                        </span>
                    )}
                </div>

                <ThemeSwatches colors={colors} />
                <div className="mt-4">
                    <ThemeMiniPreview colors={colors} />
                </div>
            </div>

            {active && (
                <span
                    className="pointer-events-none absolute -top-2 -right-2 h-8 w-8 rounded-full text-white shadow-lg flex items-center justify-center"
                    style={{
                        backgroundColor: colors.primary,
                        animation: 'pulse 0.7s ease-out 1',
                    }}
                    aria-hidden="true"
                >
                    <CheckCircle2 className="w-5 h-5" />
                </span>
            )}
        </button>
    );
}

export default function ThemePresetSelector() {
    const { selectedThemePreset, setSelectedThemePreset, presetNames, themePresets } = useThemePreset();
    const toast = useToast();

    const currentPreset = themePresets[selectedThemePreset] || themePresets.Default;

    const handleSelect = (name) => {
        if (name === selectedThemePreset) return;
        setSelectedThemePreset(name);
        toast.info(`Theme changed to ${name}`, {
            title: 'Appearance updated',
            dedupeKey: `theme-${name}`,
            duration: 2200,
        });
    };

    return (
        <section className="relative overflow-hidden bg-gradient-to-br from-white via-slate-50/60 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-5 md:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_10px_35px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_42px_rgba(2,6,23,0.45)] space-y-5">
            <div className="pointer-events-none absolute inset-0 opacity-90" style={{ backgroundImage: 'radial-gradient(circle at 8% -5%, color-mix(in srgb, var(--color-primary-soft) 55%, transparent 45%) 0%, transparent 36%), radial-gradient(circle at 110% 120%, color-mix(in srgb, var(--color-accent-soft) 42%, transparent 58%) 0%, transparent 48%)' }} />

            <div className="relative flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-2xl bg-[color:var(--color-primary-soft)]/90 text-[color:var(--color-primary)] shadow-sm border border-white/70 dark:border-slate-700/70">
                        <Palette className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">Theme Preset</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Choose a visual style for the app. Your preference is saved automatically.</p>
                    </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                    <Sparkles className="w-3.5 h-3.5 text-[color:var(--color-accent)]" />
                    {presetNames.length} styles
                </span>
            </div>

            <div className="relative rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white/75 dark:bg-slate-900/70 backdrop-blur-sm p-3.5 md:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <p className="text-xs uppercase tracking-wider font-black text-slate-500 dark:text-slate-400">Current theme</p>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black text-white" style={{ backgroundImage: `linear-gradient(120deg, ${currentPreset.colors.primary} 0%, ${currentPreset.colors.accent} 100%)` }}>
                        {selectedThemePreset}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="h-2.5 flex-1 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: '78%',
                                backgroundImage: `linear-gradient(90deg, ${currentPreset.colors.primary} 0%, ${currentPreset.colors.accent} 52%, ${currentPreset.colors.success} 100%)`,
                            }}
                        />
                    </div>
                    <ThemeSwatches colors={currentPreset.colors} />
                </div>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4" role="radiogroup" aria-label="Theme preset selector">
                {presetNames.map((name) => {
                    const preset = themePresets[name];
                    const active = selectedThemePreset === name;

                    return (
                        <ThemePresetCard
                            key={name}
                            preset={preset}
                            active={active}
                            onSelect={() => handleSelect(name)}
                        />
                    );
                })}
            </div>
        </section>
    );
}
