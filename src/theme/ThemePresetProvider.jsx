import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
    DEFAULT_THEME_PRESET_NAME,
    THEME_PRESET_STORAGE_KEY,
    themePresetNames,
    themePresets,
} from './themePresets';

const ThemePresetContext = createContext(null);

function applyThemePresetToDocument(presetName) {
    const root = document.documentElement;
    const preset = themePresets[presetName] || themePresets[DEFAULT_THEME_PRESET_NAME];
    const { colors } = preset;

    root.dataset.themePreset = presetName;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-hover', colors.primaryHover);
    root.style.setProperty('--color-primary-soft', colors.primarySoft);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-accent-soft', colors.accentSoft);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-success-soft', colors.successSoft);
    root.style.setProperty('--color-reward', colors.reward);
    root.style.setProperty('--color-reward-soft', colors.rewardSoft);
    root.style.setProperty('--color-danger', colors.danger);
    root.style.setProperty('--color-danger-soft', colors.dangerSoft);
}

function resolveInitialPreset() {
    const saved = localStorage.getItem(THEME_PRESET_STORAGE_KEY);
    if (saved && themePresetNames.includes(saved)) {
        return saved;
    }
    return DEFAULT_THEME_PRESET_NAME;
}

export function ThemePresetProvider({ children }) {
    const [selectedThemePreset, setSelectedThemePreset] = useState(resolveInitialPreset);

    useEffect(() => {
        applyThemePresetToDocument(selectedThemePreset);
        localStorage.setItem(THEME_PRESET_STORAGE_KEY, selectedThemePreset);
    }, [selectedThemePreset]);

    const setThemePreset = (presetName) => {
        const nextPreset = themePresets[presetName] ? presetName : DEFAULT_THEME_PRESET_NAME;
        setSelectedThemePreset(nextPreset);
    };

    const value = useMemo(() => ({
        selectedThemePreset,
        setSelectedThemePreset: setThemePreset,
        themePresets,
        presetNames: themePresetNames,
    }), [selectedThemePreset]);

    return (
        <ThemePresetContext.Provider value={value}>
            {children}
        </ThemePresetContext.Provider>
    );
}

export function useThemePreset() {
    const context = useContext(ThemePresetContext);
    if (!context) {
        throw new Error('useThemePreset must be used inside ThemePresetProvider');
    }
    return context;
}
